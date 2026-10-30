import { useState } from 'react'
import waiterDeliveryApi from '../../api/waiterDeliveryApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, formatTime, itemOptionsText } from '../../utils/orderFormat'
import usePolling from '../../utils/usePolling'

/** Nhãn trạng thái cho phục vụ: đơn chưa pha xong thì chưa lấy được. */
function stepBadge(o) {
  if (o.deliveryStatus === 'OUT_FOR_DELIVERY' || o.deliveryStatus === 'PICKED_UP') {
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

  return (
    <div className="staff-content p-3 p-md-4">
      {error && <div className="alert alert-danger py-2">{error}</div>}

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
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
