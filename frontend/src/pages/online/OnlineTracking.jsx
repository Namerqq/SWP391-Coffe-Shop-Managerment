import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import onlineOrderApi from '../../api/onlineOrderApi'
import { errorMessage } from '../../api/axiosClient'
import { elapsedLabel, formatMoney, itemOptionsText } from '../../utils/orderFormat'
import usePolling from '../../utils/usePolling'


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

export default function OnlineTracking() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialOrderId = searchParams.get('orderId') || localStorage.getItem('online_last_order_id')

  const [activeOrderId, setActiveOrderId] = useState(initialOrderId)
  const [phone, setPhone] = useState(() => localStorage.getItem('online_last_phone') || '')
  const [orderList, setOrderList] = useState([])
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  // Tải danh sách các đơn theo số điện thoại
  const loadOrderHistory = async (phoneNum, autoSelect = false) => {
    if (!phoneNum || !phoneNum.trim()) return
    try {
      const res = await onlineOrderApi.getOrdersByPhone(phoneNum.trim())
      const list = res.data || []
      setOrderList(list)
      if (list.length > 0 && (autoSelect || !activeOrderId)) {
        selectOrder(list[0].orderId)
      } else if (list.length === 0 && autoSelect) {
        alert('Không tìm thấy đơn hàng nào với số điện thoại: ' + phoneNum.trim())
      }
    } catch {
      // bỏ qua lỗi nếu không tìm thấy
    }
  }

  useEffect(() => {
    const savedPhone = localStorage.getItem('online_last_phone')
    if (savedPhone) {
      loadOrderHistory(savedPhone, false)
    }
  }, [])

  // Tải thông tin đơn hàng đang chọn từ API
  const fetchOrder = async () => {
    if (!activeOrderId) {
      setLoading(false)
      return
    }

    try {
      const res = await onlineOrderApi.getOrderById(activeOrderId)
      setOrder(res.data)
      setError('')
      // Tự động đồng bộ số điện thoại nếu chưa có
      if (res.data?.customerPhone && !phone) {
        setPhone(res.data.customerPhone)
        localStorage.setItem('online_last_phone', res.data.customerPhone)
        loadOrderHistory(res.data.customerPhone, false)
      }
    } catch (err) {
      if (!order) setError(errorMessage(err, 'Không tìm thấy thông tin đơn hàng.'))
    } finally {
      setLoading(false)
    }
  }

  // Tự động làm mới trạng thái mỗi 30 giây
  usePolling(fetchOrder, 30000)

  useEffect(() => {
    if (activeOrderId) {
      setLoading(true)
      fetchOrder()
    }
  }, [activeOrderId])

  const selectOrder = (id) => {
    setActiveOrderId(id)
    setSearchParams({ orderId: id })
    localStorage.setItem('online_last_order_id', String(id))
  }

  const handlePhoneSearch = (e) => {
    e.preventDefault()
    if (phone.trim()) {
      localStorage.setItem('online_last_phone', phone.trim())
      loadOrderHistory(phone.trim(), true)
    }
  }

  // Xử lý khách bấm nút "Hủy đơn hàng"
  const handleCancel = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return
    setCancelling(true)
    try {
      const res = await onlineOrderApi.cancelOrder(order.orderId, 'Khách hàng tự hủy trên website')
      setOrder(res.data)
      if (phone) loadOrderHistory(phone)
      alert('Đã hủy đơn hàng thành công.')
    } catch (err) {
      alert(errorMessage(err, 'Không thể hủy đơn hàng vào lúc này.'))
    } finally {
      setCancelling(false)
    }
  }

  // 1. Đang tải
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <div className="gx-muted mt-2">Đang tải thông tin đơn hàng...</div>
      </div>
    )
  }

  // 2. Chưa có đơn hàng nào
  if (!activeOrderId && !order) {
    return (
      <>
        <h1 className="gx-title">Đơn hàng của bạn</h1>
        <div className="gx-card mb-3 p-3">
          <form onSubmit={handlePhoneSearch} className="d-flex gap-2">
            <input
              type="tel"
              className="form-control"
              placeholder="Nhập số điện thoại để tra cứu đơn..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
            />
            <button type="submit" className="btn btn-primary text-nowrap">
              Tra cứu
            </button>
          </form>
        </div>
        <div className="gx-card text-center p-4">
          <h5>Chưa có đơn hàng nào</h5>
          <p className="gx-muted">
            {error || 'Bạn chưa đặt đơn hàng nào gần đây hoặc chưa nhập đúng số điện thoại.'}
          </p>
          <div className="mt-3">
            <Link to="/online-order" className="btn btn-primary">
              Xem thực đơn và đặt món
            </Link>
          </div>
        </div>
      </>
    )
  }

  const currentStep = getStepIndex(order)
  const isCancelled = currentStep === -1
  const canCancel = currentStep === 0 
  const badge = getStatusBadge(order, currentStep)

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h1 className="gx-title mb-0">Đơn hàng của bạn</h1>
        <form onSubmit={handlePhoneSearch} className="d-flex gap-1" style={{ maxWidth: 280 }}>
          <input
            type="tel"
            className="form-control form-control-sm"
            placeholder="Tra cứu theo SĐT..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={10}
          />
          <button type="submit" className="btn btn-outline-primary btn-sm text-nowrap">
            Tìm
          </button>
        </form>
      </div>

      {/* Danh sách các đơn đã đặt */}
      {orderList.length > 0 && (
        <div className="d-flex gap-2 overflow-auto pb-2 mb-3 align-items-center" style={{ whiteSpace: 'nowrap' }}>
          <span className="small text-muted me-1">Đơn của bạn:</span>
          {orderList.map((item) => {
            const isSelected = item.orderId === order?.orderId
            return (
              <button
                key={item.orderId}
                type="button"
                className={`btn btn-sm ${isSelected ? 'btn-primary shadow-sm' : 'btn-outline-secondary'}`}
                style={{ borderRadius: 20, fontSize: '0.8rem', padding: '4px 12px' }}
                onClick={() => selectOrder(item.orderId)}
              >
                #{item.orderNumber || item.orderId} ({item.status})
              </button>
            )
          })}
        </div>
      )}

      <article className="gx-card gx-order mb-3">
        {/* Header: Mã đơn + Thời gian đặt + Badge trạng thái */}
        <header>
          <div>
            <span className="gx-order-no">#{order.orderNumber || `ONL-${order.orderId}`}</span>
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

        {/* Nút Hủy đơn hàng: Chỉ hiện khi ở Bước 1 ("Đã nhận đơn") */}
        {canCancel && (
          <div className="text-end mt-2 pt-2 border-top">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
            </button>
          </div>
        )}
      </article>

      {/* Nút quay lại xem thực đơn */}
      <div className="text-center mt-3 mb-4">
        <Link to="/online-order" className="btn btn-light-soft">
          ← Quay lại xem thực đơn
        </Link>
      </div>
    </>
  )
}
