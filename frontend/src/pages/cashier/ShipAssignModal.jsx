import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, formatTime, itemOptionsText } from '../../utils/orderFormat'

// Đơn đã xác nhận (chờ pha / đang pha / pha xong) và phục vụ chưa lấy hàng thì còn gán / đổi người được
const ASSIGNABLE_ORDER = ['CONFIRMED', 'PREPARING', 'READY']
const ASSIGNABLE_DELIVERY = ['PENDING_ASSIGNMENT', 'ASSIGNED']

export const canAssign = (o) =>
  ASSIGNABLE_ORDER.includes(o.status) && ASSIGNABLE_DELIVERY.includes(o.deliveryStatus)

/**
 * Chi tiết 1 đơn giao hàng + chọn phục vụ đi giao (Iter 3).
 * Gọi lại API khi mở để có dữ liệu mới nhất, không dùng bản trên thẻ (có thể đã cũ 10 giây).
 */
export default function ShipAssignModal({ orderId, onClose, onChanged }) {
  const [order, setOrder] = useState(null)
  const [waiters, setWaiters] = useState([])
  const [waiterId, setWaiterId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [o, w] = await Promise.all([cashierApi.getDeliveryOrder(orderId), cashierApi.getWaiters()])
      setOrder(o.data)
      setWaiters(w.data || [])
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Không tải được chi tiết đơn.'))
    }
  }

  useEffect(() => {
    load()
  }, [orderId])

  const assignable = order && canAssign(order)
  const changing = Boolean(order?.assignedWaiterName)

  const handleAssign = async () => {
    if (!waiterId) {
      setError('Chọn phục vụ đi giao.')
      return
    }
    setSaving(true)
    try {
      const res = await cashierApi.assignWaiter(orderId, Number(waiterId))
      onChanged?.(`Đã gán ${res.data.assignedWaiterName} giao đơn ${res.data.orderNumber}.`)
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Không gán được người giao.'))
      // Đơn đã đổi trạng thái (thu ngân khác gán / phục vụ đã lấy hàng): tải lại cho đúng
      if (err.response?.status === 409) {
        await load()
        onChanged?.()
      }
    } finally {
      setSaving(false)
    }
  }

  const isPaid = order?.paymentStatus === 'PAID'
  const timeline = order
    ? [
        ['Đặt đơn', order.createdAt],
        ['Gán người giao', order.assignedAt],
        ['Lấy hàng', order.pickedUpAt],
        ['Giao xong', order.deliveredAt],
        ['Giao lỗi', order.failedAt],
      ].filter(([, t]) => t)
    : []

  return (
    <Modal
      show
      size="lg"
      title={order ? `Đơn ${order.orderNumber}` : 'Chi tiết đơn giao hàng'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-light" onClick={onClose}>
            Đóng
          </button>
          {assignable && (
            <button type="button" className="btn btn-primary" disabled={saving || !waiterId} onClick={handleAssign}>
              {saving && <span className="spinner-border spinner-border-sm me-1" />}
              {changing ? 'Đổi người giao' : 'Gán người giao'}
            </button>
          )}
        </>
      }
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {!order ? (
        !error && <div className="text-center py-4"><span className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="mb-3">
            <div className="fw-semibold">
              <i className="bi bi-person me-1 text-secondary" />
              {order.customerName} &bull; <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
            </div>
            <div className="small text-muted mt-1">
              <i className="bi bi-geo-alt me-1 text-danger" />
              {order.deliveryAddress}
            </div>
            {order.customerNote && <div className="small fst-italic mt-1">"{order.customerNote}"</div>}
          </div>

          <div className="border rounded-2 p-2 mb-3">
            {order.items?.map((it, idx) => (
              <div key={idx} className="d-flex justify-content-between small py-1">
                <div>
                  <span className="fw-bold me-1">{it.quantity}x</span>
                  {it.itemName}
                  {itemOptionsText(it) && <div className="text-muted">{itemOptionsText(it)}</div>}
                </div>
                <span>{formatMoney(it.subtotal || it.unitPrice * it.quantity)}</span>
              </div>
            ))}
            <div className="d-flex justify-content-between small border-top pt-1 mt-1">
              <span>Tiền món {formatMoney(order.totalAmount)} + ship {formatMoney(order.shippingFee || 0)}</span>
              <span>
                {isPaid ? 'Đã trả tiền món · ' : ''}Cần thu khi giao:{' '}
                <strong>{formatMoney((isPaid ? 0 : order.totalAmount) + (order.shippingFee || 0))}</strong>
              </span>
            </div>
          </div>

          {timeline.length > 0 && (
            <ul className="list-unstyled small mb-3">
              {timeline.map(([label, t]) => (
                <li key={label}>
                  <i className="bi bi-clock me-1 text-muted" />
                  {formatTime(t)} · {label}
                </li>
              ))}
            </ul>
          )}
          {order.failureReason && <div className="small text-danger mb-3">Lý do giao lỗi: {order.failureReason}</div>}

          <div className="mb-1 fw-semibold">
            Người giao: {order.assignedWaiterName || <span className="text-muted fw-normal">chưa có</span>}
          </div>
          {assignable ? (
            waiters.length === 0 ? (
              <div className="small text-muted">Không có phục vụ nào đang hoạt động.</div>
            ) : (
              <select className="form-select" value={waiterId} onChange={(e) => setWaiterId(e.target.value)}>
                <option value="">{changing ? '-- Chọn người khác --' : '-- Chọn phục vụ đi giao --'}</option>
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.holdingCount} đơn đang cầm)
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="small text-muted">
              {order.status === 'PENDING_CONFIRMATION'
                ? 'Xác nhận đơn trước rồi mới gán người giao.'
                : 'Đơn này không còn gán / đổi người giao được.'}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
