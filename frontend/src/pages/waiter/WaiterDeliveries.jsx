import { useState } from 'react'
import waiterDeliveryApi from '../../api/waiterDeliveryApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, formatTime, itemOptionsText } from '../../utils/orderFormat'
import usePolling from '../../utils/usePolling'
import CancelOrderModal from './CancelOrderModal'

const isOut = (o) => o.deliveryStatus === 'OUT_FOR_DELIVERY' || o.deliveryStatus === 'PICKED_UP'

/** Nhãn trạng thái cho phục vụ: đơn chưa pha xong thì chưa lấy được. */
function stepBadge(o) {
  if (isOut(o)) {
    return { label: 'Đang giao', pillClass: 'status-pill tone-pending' }
  }
  if (o.status === 'READY') return { label: 'Pha xong, lấy hàng được', pillClass: 'status-pill tone-ready' }
  return { label: 'Đang chờ pha', pillClass: 'status-pill tone-preparing' }
}

/**
 * Đơn giao hàng của tôi (Iter 3): phục vụ xem các đơn thu ngân đã gán cho mình.
 * Tự tải lại mỗi 10 giây để thấy đơn mới gán / đơn vừa pha xong.
 */
export default function WaiterDeliveries() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [processingId, setProcessingId] = useState(null) // đơn đang gửi thao tác, khóa nút tránh bấm 2 lần
  const [failOrder, setFailOrder] = useState(null) // đơn đang mở popup nhập lý do giao lỗi

  const loadOrders = async () => {
    try {
      const res = await waiterDeliveryApi.getMyDeliveries()
      setOrders(res.data || [])
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Không tải được đơn giao hàng của bạn.'))
    } finally {
      setLoading(false)
    }
  }

  usePolling(loadOrders, 10000)

  /** Gửi 1 thao tác giao hàng rồi tải lại danh sách. Lỗi 409 (đơn đã đổi trạng thái) cũng tải lại cho đúng. */
  const runStep = async (o, call, successText) => {
    setProcessingId(o.orderId)
    try {
      await call()
      setFeedback({ type: 'success', message: successText })
    } catch (err) {
      setFeedback({ type: 'danger', message: errorMessage(err, 'Thao tác chưa thành công, vui lòng thử lại.') })
    } finally {
      setProcessingId(null)
      loadOrders()
    }
  }

  const handlePickUp = (o) =>
    runStep(o, () => waiterDeliveryApi.pickUp(o.orderId), `Đã nhận đơn ${o.orderNumber}, bắt đầu đi giao.`)

  const handleDeliver = (o) => {
    if (!window.confirm(`Xác nhận đã giao đơn ${o.orderNumber} cho khách?`)) return
    runStep(o, () => waiterDeliveryApi.deliver(o.orderId), `Đơn ${o.orderNumber} đã giao xong.`)
  }

  /** Gửi lý do giao lỗi. Lỗi thì ném ra để popup giữ nguyên và hiện lỗi ngay dưới ô nhập. */
  const handleFail = async (reason) => {
    const o = failOrder
    try {
      await waiterDeliveryApi.fail(o.orderId, reason)
      setFailOrder(null)
      setFeedback({ type: 'warning', message: `Đã báo giao không thành công đơn ${o.orderNumber}. Đơn chuyển sang Đã hủy.` })
    } finally {
      loadOrders()
    }
  }

  return (
    <div className="staff-content p-3 p-md-4">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {feedback && (
        <div className={`alert alert-${feedback.type} alert-dismissible fade show py-2 mb-3`} role="alert">
          {feedback.message}
          <button type="button" className="btn-close py-2" onClick={() => setFeedback(null)} aria-label="Đóng" />
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <div className="text-muted mt-2">Đang tải đơn giao hàng...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center text-muted">
          <div className="fs-1 mb-2">🛵</div>
          <h6 className="fw-bold">Bạn chưa có đơn nào cần giao</h6>
          <p className="small mb-0">Khi thu ngân gán đơn cho bạn, đơn sẽ hiện ở đây.</p>
        </div>
      ) : (
        <div className="row g-3">
          {orders.map((o) => {
            const badge = stepBadge(o)
            const isPaid = o.paymentStatus === 'PAID'
            const fee = o.shippingFee || 0
            const busy = processingId === o.orderId
            return (
              <div key={o.orderId} className="col-12 col-lg-6 col-xl-4">
                <div className="card h-100 border shadow-sm" style={{ borderRadius: '0.85rem' }}>
                  <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-bold text-dark me-2">{o.orderNumber || o.displayNumber}</span>
                      <small className="text-muted">Gán lúc {formatTime(o.assignedAt)}</small>
                    </div>
                    <span className={badge.pillClass}>{badge.label}</span>
                  </div>

                  <div className="card-body p-3 d-flex flex-column">
                    <div className="mb-2">
                      <div className="fw-semibold text-dark">
                        <i className="bi bi-person me-1 text-secondary" />
                        {o.customerName} &bull;{' '}
                        <a href={`tel:${o.customerPhone}`} className="text-decoration-none">
                          {o.customerPhone}
                        </a>
                      </div>
                      <div className="small text-muted mt-1">
                        <i className="bi bi-geo-alt me-1 text-danger" />
                        {o.deliveryAddress}
                      </div>
                      {o.customerNote && (
                        <div className="small text-muted fst-italic mt-1">
                          <i className="bi bi-chat-left-text me-1 text-info" />
                          "{o.customerNote}"
                        </div>
                      )}
                    </div>

                    <div className="border rounded-2 p-2 bg-light bg-opacity-50 my-2 flex-grow-1">
                      {o.items?.map((it, idx) => (
                        <div key={idx} className="small py-1">
                          <span className="fw-bold me-1">{it.quantity}x</span>
                          <span>{it.itemName}</span>
                          {itemOptionsText(it) && (
                            <div className="text-muted" style={{ fontSize: '0.78rem' }}>{itemOptionsText(it)}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-top d-flex justify-content-between align-items-center">
                      <span
                        className={`badge ${isPaid ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'} border`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                      <div className="text-end">
                        <div className="small text-muted">Cần thu khi giao</div>
                        <span className="fw-bold text-primary fs-6">
                          {formatMoney((isPaid ? 0 : o.totalAmount) + fee)}
                        </span>
                      </div>
                    </div>

                    {/* Nhận hàng: chỉ khi pha xong. Chưa pha xong thì nút mờ để phục vụ biết phải chờ. */}
                    {!isOut(o) && (
                      <div className="pt-2 mt-2 border-top">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm w-100"
                          disabled={busy || o.status !== 'READY'}
                          onClick={() => handlePickUp(o)}
                        >
                          {busy ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-bag-check me-1" />}
                          {o.status === 'READY' ? 'Nhận hàng đi giao' : 'Chờ pha xong mới nhận được'}
                        </button>
                      </div>
                    )}

                    {/* Đang giao: khách nhận hàng xong thì bấm Đã giao */}
                    {isOut(o) && (
                      <div className="pt-2 mt-2 border-top">
                        <button
                          type="button"
                          className="btn btn-success btn-sm w-100"
                          disabled={busy}
                          onClick={() => handleDeliver(o)}
                        >
                          {busy ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2-circle me-1" />}
                          Đã giao
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm w-100 mt-2"
                          disabled={busy}
                          onClick={() => setFailOrder(o)}
                        >
                          <i className="bi bi-x-octagon me-1" />
                          Giao không thành công
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CancelOrderModal
        show={Boolean(failOrder)}
        order={failOrder}
        title="Giao không thành công đơn"
        message="Đơn sẽ chuyển sang Đã hủy. Lý do sẽ hiện cho khách và thu ngân xem."
        label="Lý do giao không thành công"
        required
        placeholder="Ví dụ: khách không nghe máy, sai địa chỉ..."
        confirmText="Xác nhận giao lỗi"
        onClose={() => setFailOrder(null)}
        onConfirm={handleFail}
      />
    </div>
  )
}
