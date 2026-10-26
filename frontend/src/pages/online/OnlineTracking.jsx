import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import onlineOrderApi from '../../api/onlineOrderApi'
import { errorMessage } from '../../api/axiosClient'
import { elapsedLabel, formatMoney, itemOptionsText } from '../../utils/orderFormat'
import usePolling from '../../utils/usePolling'
import {
  getCurrentOrderCode, isValidOrderCode, markCodePopupShown, normalizeOrderCode, wasCodePopupShown,
} from '../../utils/onlineOrderCode'
import OrderCodeDialog from './OrderCodeDialog'

const DELIVERY_STEPS = ['Đã nhận đơn', 'Xác nhận đơn hàng', 'Đang giao', 'Đã giao']

/**
 * Tính bước hiện tại (0 -> 3) hoặc -1 nếu đơn bị hủy
 */
function getStepIndex(order) {
  if (order.status === 'CANCELLED' || order.deliveryStatus === 'CANCELLED') return -1
  if (order.status === 'COMPLETED' || order.deliveryStatus === 'DELIVERED') return 3
  if (order.deliveryStatus === 'OUT_FOR_DELIVERY' || order.deliveryStatus === 'PICKED_UP') return 2
  if (order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'READY') return 1
  return 0
}

/** Nhãn và màu badge theo từng trạng thái */
function getStatusBadge(order, currentStep) {
  if (order.status === 'CANCELLED' || order.deliveryStatus === 'CANCELLED') {
    return { label: 'Đã hủy', className: 'badge bg-danger text-white' }
  }
  switch (currentStep) {
    case 0:
      return { label: 'Đã nhận đơn', className: 'badge bg-warning text-dark' }
    case 1:
      return { label: 'Đã xác nhận', className: 'badge bg-primary text-white' }
    case 2:
      return { label: 'Đang giao', className: 'badge bg-info text-dark' }
    case 3:
      return { label: 'Đã giao', className: 'badge bg-success text-white' }
    default:
      return { label: order.status, className: 'badge bg-secondary text-white' }
  }
}

/**
 * Theo dõi đơn online. Khách chỉ thấy đơn đang đặt trên máy này (đơn vừa đặt gần nhất);
 * muốn xem đơn khác phải nhập đúng mã đơn (dạng 261023-0008). Không còn tra / liệt kê theo số điện thoại.
 * Đường dẫn: /online-order/orders (đơn đang đặt) hoặc /online-order/orders?code=261023-0008 (đơn khác).
 */
export default function OnlineTracking() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentCode = getCurrentOrderCode()
  const urlCode = normalizeOrderCode(searchParams.get('code'))
  const activeCode = urlCode || currentCode

  const [codeInput, setCodeInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(Boolean(activeCode))
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [codePopup, setCodePopup] = useState(null)

  // Vừa đặt đơn COD xong (trang Đặt hàng chuyển sang kèm mã) -> popup báo mã đơn, 1 lần cho mỗi đơn.
  useEffect(() => {
    const code = location.state?.newOrderCode
    if (!code) return
    if (!wasCodePopupShown(code)) {
      markCodePopupShown(code)
      setCodePopup(code)
    }
    navigate(location.pathname + location.search, { replace: true, state: null }) // tải lại trang không hiện lại
  }, [location.state, location.pathname, location.search, navigate])

  const fetchOrder = useCallback(async (showSpinner = false) => {
    if (!activeCode) return
    if (showSpinner) setLoading(true)
    try {
      const res = await onlineOrderApi.getOrderByCode(activeCode)
      setOrder(res.data)
      setError('')
    } catch (err) {
      // Lỗi lúc tự làm mới 10 giây thì giữ nguyên đơn đang hiện; chỉ báo lỗi khi mở / đổi mã đơn.
      if (showSpinner) {
        setOrder(null)
        setError(errorMessage(err, 'Không tìm thấy đơn hàng với mã ' + activeCode + '.'))
      }
    } finally {
      setLoading(false)
    }
  }, [activeCode])

  // Đổi mã đang xem -> tải lại ngay; sau đó tự làm mới trạng thái mỗi 10 giây.
  useEffect(() => {
    setOrder(null)
    setError('')
    fetchOrder(true)
  }, [fetchOrder])
  usePolling(fetchOrder, 10000)

  const lookup = (e) => {
    e.preventDefault()
    const code = normalizeOrderCode(codeInput)
    if (!isValidOrderCode(code)) {
      setInputError('Mã đơn có dạng 261023-0008 (xem trong popup hoặc trang thanh toán khi đặt hàng).')
      return
    }
    setInputError('')
    setCodeInput('')
    setSearchParams({ code })
  }

  // Xử lý khách bấm nút "Hủy đơn hàng"
  // Trang chỉ tự làm mới 10 giây/lần nên đơn đang hiện có thể đã cũ (thu ngân vừa xác nhận):
  // hỏi lại trạng thái mới nhất trước khi hỏi khách, và tải lại đơn nếu hủy không thành công.
  const handleCancel = async () => {
    setCancelling(true)
    try {
      const latest = (await onlineOrderApi.getOrderByCode(order.orderNumber)).data
      setOrder(latest)
      const step = getStepIndex(latest)
      if (step !== 0) {
        alert(step === -1 ? 'Đơn hàng này đã được hủy.' : 'Quán đã xác nhận đơn hàng này nên không thể hủy nữa.')
        return
      }
      if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return
      const res = await onlineOrderApi.cancelOrder(order.orderNumber, 'Khách hàng tự hủy trên website')
      setOrder(res.data)
      alert('Đã hủy đơn hàng thành công.')
    } catch (err) {
      alert(errorMessage(err, 'Không thể hủy đơn hàng vào lúc này.'))
      fetchOrder()
    } finally {
      setCancelling(false)
    }
  }

  const lookupForm = (
    <form onSubmit={lookup} noValidate className="gx-card mb-3 p-3">
      <label htmlFor="ot-code" className="form-label fw-bold mb-1">Xem đơn khác</label>
      <div className="d-flex gap-2">
        <input
          id="ot-code"
          type="text"
          className="form-control"
          placeholder="Nhập mã đơn, ví dụ 261023-0008"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          maxLength={20}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary text-nowrap">Xem đơn</button>
      </div>
      {inputError && <div className="text-danger small mt-1">{inputError}</div>}
      {urlCode && currentCode && urlCode !== currentCode && (
        <button type="button" className="btn btn-link btn-sm px-0 mt-1" onClick={() => setSearchParams({})}>
          ← Về đơn đang đặt ({currentCode})
        </button>
      )}
    </form>
  )

  const popup = <OrderCodeDialog code={codePopup} onClose={() => setCodePopup(null)} />

  // 1. Đang tải
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <div className="gx-muted mt-2">Đang tải thông tin đơn hàng...</div>
        {popup}
      </div>
    )
  }

  // 2. Chưa có đơn đang đặt, hoặc mã nhập không tìm thấy
  if (!order) {
    return (
      <>
        <h1 className="gx-title">Đơn hàng của bạn</h1>
        {lookupForm}
        <div className="gx-card text-center p-4">
          <h5>{activeCode ? 'Không xem được đơn này' : 'Chưa có đơn hàng nào'}</h5>
          <p className="gx-muted">
            {error || 'Máy này chưa đặt đơn nào. Nếu bạn đã đặt trên máy khác, hãy nhập mã đơn ở trên.'}
          </p>
          <div className="mt-3">
            <Link to="/online-order" className="btn btn-primary">Xem thực đơn và đặt món</Link>
          </div>
        </div>
        {popup}
      </>
    )
  }

  const currentStep = getStepIndex(order)
  const isCancelled = currentStep === -1
  const canCancel = currentStep === 0
  const badge = getStatusBadge(order, currentStep)

  return (
    <>
      <h1 className="gx-title mb-2">Đơn hàng của bạn</h1>
      {lookupForm}

      <article className="gx-card gx-order mb-3">
        {/* Header: Mã đơn + Thời gian đặt + Badge trạng thái */}
        <header>
          <div>
            <span className="gx-order-no">#{order.orderNumber}</span>
            <span className="gx-muted"> · {elapsedLabel(order.createdAt)} trước</span>
          </div>
          <span className={`${badge.className} px-2 py-1`}>{badge.label}</span>
        </header>

        {/* ẩn nếu đơn đã bị hủy */}
        {!isCancelled ? (
          <ol className="gx-steps" aria-label="Tiến độ đơn hàng">
            {DELIVERY_STEPS.map((label, idx) => (
              <li
                key={label}
                className={idx < currentStep ? 'done' : idx === currentStep ? 'current' : ''}
              >
                <span />
                {label}
              </li>
            ))}
          </ol>
        ) : (
          <div className="alert alert-danger py-2 my-3 text-center" style={{ fontSize: '0.9rem' }}>
            <strong>Đơn hàng đã bị hủy.</strong>
            {order.cancelReason && <div className="small mt-1">Lý do: {order.cancelReason}</div>}
          </div>
        )}

        {/* Khung thông tin người nhận */}
        <div className="bg-light rounded p-2 mb-3 text-secondary" style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
          <div>
            <strong className="text-dark">Người nhận:</strong> {order.customerName} ({order.customerPhone})
          </div>
          <div>
            <strong className="text-dark">Địa chỉ giao:</strong> {order.deliveryAddress}
          </div>
          <div>
            <strong className="text-dark">Ghi chú:</strong> {order.customerNote || 'Giao hàng tận nơi'}
          </div>
        </div>

        {/* Danh sách món trong đơn */}
        {order.items?.map((item) => (
          <div className="gx-order-line" key={item.id || item.menuItemId}>
            <span className="gx-order-qty">{item.quantity}×</span>
            <div className="flex-grow-1">
              <div>{item.itemName}</div>
              {itemOptionsText(item) && <div className="gx-muted">{itemOptionsText(item)}</div>}
            </div>
            <span className="gx-price">
              {formatMoney(item.subtotal || item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}

        {/* Tổng tiền */}
        <footer>
          <span>Tổng tiền:</span>
          <span className="gx-price fs-5">{formatMoney(order.totalAmount)}</span>
        </footer>

        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top gap-2">
          {/* Hóa đơn chỉ có khi đơn đã thanh toán */}
          {order.paymentStatus === 'PAID' ? (
            <Link to={`/online-receipts?code=${encodeURIComponent(order.orderNumber)}`} className="btn btn-light-soft btn-sm">
              Xem hóa đơn
            </Link>
          ) : <span />}
          {/* Nút Hủy đơn hàng: Chỉ hiện khi ở Bước 1 ("Đã nhận đơn") */}
          {canCancel && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
            </button>
          )}
        </div>
      </article>

      {/* Nút quay lại xem thực đơn */}
      <div className="text-center mt-3 mb-4">
        <Link to="/online-order" className="btn btn-light-soft">
          ← Quay lại xem thực đơn
        </Link>
      </div>
      {popup}
    </>
  )
}
