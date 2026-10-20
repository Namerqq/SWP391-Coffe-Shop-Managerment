import { useCallback, useState } from 'react'
import servingApi from '../../api/servingApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import { ON_BOARD, isItemCancelled, isItemReady, isItemWaiting } from '../../utils/itemStatus'
import OrderTicket from '../serving/OrderTicket'
import IncidentModal from './IncidentModal'
import '../../styles/danmt.css'

// Order Ready to Serve (Waiter) — SRS 1.4.2, UC-W08. Bảng 2 cột giống pha chế, chỉ đơn tại bàn:
//   Chờ pha (chỉ xem: biết món nào sắp xong)   |   Chờ mang ra (mang ra bàn, tích từng món; đủ món thì đơn tự xong)
const COLUMNS = [
  { key: 'pending', label: 'Chờ pha', tone: 'pending', pick: (o) => o.items.filter(isItemWaiting), empty: 'Không có món nào đang pha' },
  { key: 'ready', label: 'Chờ mang ra', tone: 'ready', pick: (o) => o.items.filter(isItemReady), empty: 'Không có món chờ mang ra' },
]

export default function WaiterBoard() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyItemId, setBusyItemId] = useState(null)
  const [incidentTarget, setIncidentTarget] = useState(null) // { order, item } khi bấm báo sự cố vỡ ly

  const load = useCallback(async () => {
    try {
      const res = await servingApi.getBoard()
      setOrders(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách đơn.'))
    } finally {
      setLoading(false)
    }
  }, [])
  usePolling(load, 5000)

  // Đã mang 1 món ra bàn. Mang đủ món thì backend tự chuyển đơn sang "Đã phục vụ".
  const serve = async (order, item) => {
    setBusyItemId(item.id)
    try {
      const res = await servingApi.serveItem(order.id, item.id)
      setOrders((list) => list
        .map((x) => (x.id === res.data.id ? res.data : x))
        .filter((x) => ON_BOARD.includes(x.status)))
      toast(res.data.status === 'COMPLETED'
        ? `Đã mang đủ món đơn ${order.displayNumber} ra ${order.tableNumber}`
        : `Đã mang ${item.itemName} ra ${order.tableNumber}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      load()
    } finally {
      setBusyItemId(null)
    }
  }

  // Món pha chế đã hủy vì hết nguyên liệu: phục vụ cần báo lại cho khách.
  const cancelledNote = (o) => {
    const list = o.items.filter(isItemCancelled)
    if (list.length === 0) return null
    return (
      <div className="kds-cancelled-note mx-3 mb-2">
        <i className="bi bi-exclamation-triangle me-1" />Đã hủy vì hết nguyên liệu, báo khách: {list.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}
      </div>
    )
  }

  const renderCard = (o, items, col) => {
    const waitingLeft = o.items.filter(isItemWaiting).length
    if (col.key === 'pending') {
      return (
        <OrderTicket key={o.id} order={o} items={items} tone={col.tone}>
          {cancelledNote(o)}
          <div className="kds-waiting text-body-secondary"><i className="bi bi-hourglass-split me-1" />Pha chế đang làm</div>
        </OrderTicket>
      )
    }
    return (
      <OrderTicket key={o.id} order={o} items={items} tone={col.tone}
                   renderLeft={(i) => (
                     <input type="checkbox" className="form-check-input kds-check" checked={false}
                            disabled={busyItemId === i.id} onChange={() => serve(o, i)}
                            aria-label={`Đã mang ${i.itemName} ra bàn`} title="Tích khi đã mang món này ra bàn" />
                   )}
                   renderRight={(i) => (
                     <button type="button"
                             className="btn btn-sm btn-outline-danger border-0 p-1 ms-1"
                             disabled={busyItemId === i.id}
                             title="Báo sự cố làm đổ / vỡ ly này"
                             onClick={() => setIncidentTarget({ order: o, item: i })}>
                       <i className="bi bi-exclamation-triangle-fill" />
                     </button>
                   )}>
        {waitingLeft === 0 && cancelledNote(o)}
        <div className="kds-waiting">
          <i className="bi bi-geo-alt me-1" />Mang ra {o.tableNumber}
          {waitingLeft > 0 && <span className="cf-muted">, còn {waitingLeft} món đang pha</span>}
        </div>
      </OrderTicket>
    )
  }

  const handleIncidentSuccess = (updatedOrder) => {
    setOrders((list) => list
      .map((x) => (x.id === updatedOrder.id ? updatedOrder : x))
      .filter((x) => ON_BOARD.includes(x.status)))
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title">Chờ pha & mang ra</h1>
        <p className="page-subtitle">
          Đơn tại bàn, tự cập nhật mỗi 5 giây. Pha chế xong món nào thì món đó hiện ở Chờ mang ra; mang ra bàn rồi tích từng món, đủ món thì đơn tự hoàn thành.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="kds-columns two">
        {COLUMNS.map((col) => {
          const list = orders.map((o) => ({ o, items: col.pick(o) })).filter((x) => x.items.length > 0)
          return (
            <section key={col.key} className={`tone-${col.tone}`} aria-label={col.label}>
              <div className="kds-col-head"><span>{col.label}</span><span className="count">{list.length}</span></div>
              {list.map(({ o, items }) => renderCard(o, items, col))}
              {!loading && list.length === 0 && <div className="cell-sub py-2">{col.empty}</div>}
            </section>
          )
        })}
      </div>

      {/* Modal báo cáo sự cố làm vỡ / đổ nước */}
      <IncidentModal
        show={Boolean(incidentTarget)}
        order={incidentTarget?.order}
        item={incidentTarget?.item}
        onClose={() => setIncidentTarget(null)}
        onSuccess={handleIncidentSuccess}
      />
    </>
  )
}
