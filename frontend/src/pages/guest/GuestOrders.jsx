import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import guestTrackingApi from '../../api/guestTrackingApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { useGuest } from '../../layouts/GuestLayout'
import StatusPill from '../../components/order/StatusPill'
import usePolling from '../../utils/usePolling'
import { formatMoney, formatTime, isWaiting, itemOptionsText } from '../../utils/orderFormat'
import GuestCancelModal from './GuestCancelModal'

// Order Tracking (Customer) — UC-CU03. Trạng thái giống màn Pha chế / Phục vụ của DanMT.
const STEPS = ['Chờ pha', 'Đang pha', 'Chờ mang ra', 'Đã phục vụ']
const stepOf = (s) => (isWaiting(s) ? 0 : s === 'PREPARING' ? 1 : s === 'READY' ? 2 : s === 'COMPLETED' ? 3 : -1)

export default function GuestOrders() {
  const toast = useToast()
  const { table, tableChecked, expire } = useGuest()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(null)

  const load = useCallback(async () => {
    if (!table) { setLoading(false); return }
    try {
      const res = await guestTrackingApi.getMyOrders()
      setOrders(res.data)
      setError('')
    } catch (e) {
      if (e.response?.status === 410) expire(errorMessage(e))
      else setError(errorMessage(e, 'Chưa tải được đơn hàng.'))
    } finally {
      setLoading(false)
    }
  }, [table, expire])
  usePolling(load, 5000)

  const confirmCancel = async (reason) => {
    await guestTrackingApi.cancel(cancelling.id, reason)
    toast(`Đã hủy đơn ${cancelling.displayNumber}`)
    setCancelling(null)
    load()
  }

  if (tableChecked && !table) {
    return (
      <div className="gx-empty">
        <i className="bi bi-qr-code-scan gx-empty-icon" />
        <p>Quét mã QR trên bàn để xem đơn bạn đã gọi.</p>
      </div>
    )
  }

  return (
    <>
      <h1 className="gx-title">Đơn của tôi {table && <span>{table.tableNumber}</span>}</h1>
      <p className="gx-muted mb-3">Tự cập nhật mỗi 5 giây. Thanh toán tại quầy sau khi dùng xong.</p>

      {error && <div className="gx-alert" role="alert"><i className="bi bi-exclamation-circle" />{error}</div>}
      {loading && <div className="gx-empty"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}
      {!loading && !error && orders.length === 0 && (
        <div className="gx-empty">
          <i className="bi bi-receipt gx-empty-icon" />
          <p>Bạn chưa gọi món nào.</p>
          <Link to="/menu" className="btn btn-primary">Xem thực đơn</Link>
        </div>
      )}

      {orders.map((o) => {
        const step = stepOf(o.status)
        const cancelled = step < 0
        const items = o.items.filter((i) => cancelled || i.status !== 'CANCELLED')
        return (
          <article key={o.id} className={`gx-card gx-order ${cancelled ? 'is-cancelled' : ''}`}>
            <header>
              <div>
                <span className="gx-order-no">{o.displayNumber}</span>
                <span className="gx-muted"> · gọi lúc {formatTime(o.createdAt)}</span>
              </div>
              <StatusPill status={o.status} />
            </header>

            {!cancelled && (
              <ol className="gx-steps" aria-label="Tiến độ đơn">
                {STEPS.map((label, i) => (
                  <li key={label} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
                    <span />{label}
                  </li>
                ))}
              </ol>
            )}

            {items.map((i) => (
              <div className="gx-order-line" key={i.id}>
                <span className="gx-order-qty">{i.quantity}×</span>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div>{i.itemName}</div>
                  {itemOptionsText(i) && <div className="gx-muted">{itemOptionsText(i)}</div>}
                  {i.note && <div className="gx-note">{i.note}</div>}
                </div>
                {!cancelled && <span>{formatMoney(i.subtotal)}</span>}
              </div>
            ))}

            <footer>
              {cancelled
                ? <span className="gx-muted">{o.cancelReason || 'Đơn đã hủy'}</span>
                : <strong>{formatMoney(o.totalAmount)}</strong>}
              {isWaiting(o.status) && (
                <button type="button" className="gx-link danger" onClick={() => setCancelling(o)}>Hủy đơn</button>
              )}
            </footer>
          </article>
        )
      })}

      <GuestCancelModal order={cancelling} onClose={() => setCancelling(null)} onConfirm={confirmCancel} />
    </>
  )
}
