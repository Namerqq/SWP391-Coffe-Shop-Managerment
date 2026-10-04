import { useCallback, useState } from 'react'
import servingApi from '../../api/servingApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import { elapsedLabel, itemOptionsText, minutesSince } from '../../utils/orderFormat'
import '../../styles/danmt.css'

/**
 * Order Ready to Serve (Waiter + Cashier) — SRS 1.4.2 / 1.3.5, UC-W08.
 *  type="DINE_IN": Phục vụ mang món ra bàn.   type="PICKUP": Thu ngân giao đơn mang đi tại quầy.
 */
export default function ReadyOrders({ type = 'DINE_IN' }) {
  const pickup = type === 'PICKUP'
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await servingApi.getReady(type)
      setOrders(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách món chờ.'))
    } finally {
      setLoading(false)
    }
  }, [type])
  usePolling(load, 5000)

  const serve = async (o) => {
    setBusyId(o.id)
    try {
      await servingApi.markServed(o.id)
      toast(pickup ? `Đã giao đơn ${o.displayNumber} cho khách` : `Đã mang đơn ${o.displayNumber} ra ${o.tableNumber}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusyId(null)
      load()
    }
  }

  const waited = (v) => (minutesSince(v) < 1 ? 'vừa pha xong' : `đã chờ ${elapsedLabel(v)}`)

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title">{pickup ? 'Mang đi chờ giao' : 'Món chờ mang ra'}</h1>
        <p className="page-subtitle">
          {pickup ? 'Đơn mang đi đã pha xong, gọi số và giao cho khách tại quầy.' : 'Pha chế đã làm xong.'} Tự cập nhật, đơn chờ lâu nhất ở trên cùng.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="cf-card empty-state"><i className="bi bi-bell" />Không có món nào đang chờ</div>
      )}

      <div className="ready-grid">
        {orders.map((o) => (
          <article key={o.id} className={`cf-card ready-card ${minutesSince(o.updatedAt) >= 5 ? 'late' : ''}`}>
            <header className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="ready-dest">{pickup ? o.displayNumber : o.tableNumber}</div>
                <div className="cell-sub">
                  {pickup ? (o.customerName || 'Khách mang đi') : `Đơn ${o.displayNumber}`}, {waited(o.updatedAt)}
                </div>
              </div>
              <span className="status-pill tone-ready">Chờ mang ra</span>
            </header>
            <div>
              {o.items.filter((i) => i.status !== 'CANCELLED').map((i) => (
                <div className="order-line" key={i.id}>
                  <span className="order-qty">{i.quantity}×</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="fw-semibold">{i.itemName}</div>
                    {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
                    {i.note && <div className="order-note">{i.note}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-primary w-100 mt-auto" disabled={busyId === o.id} onClick={() => serve(o)}>
              {busyId === o.id && <span className="spinner-border spinner-border-sm me-2" />}
              {pickup ? 'Đã giao cho khách' : 'Đã mang ra bàn'}
            </button>
          </article>
        ))}
      </div>
    </>
  )
}
