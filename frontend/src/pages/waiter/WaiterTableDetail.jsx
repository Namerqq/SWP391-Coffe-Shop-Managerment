import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import waiterApi from '../../api/waiterApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import ConfirmModal from '../../components/ConfirmModal'
import ItemOptionsModal from '../../components/order/ItemOptionsModal'
import StatusPill from '../../components/order/StatusPill'
import { formatMoney, formatTime, isWaiting, itemOptionsText } from '../../utils/orderFormat'
import { findMenuItem, toItemRequest } from '../../utils/orderOptions'
import CancelOrderModal from './CancelOrderModal'
import '../../styles/danmt.css'

// Order Detail & Edit Pending Order (Waiter) — UC-W05, UC-W06, UC-W07.
// Chỉ đơn "Chờ pha" mới sửa / bỏ món / hủy được (GB-02).
export default function WaiterTableDetail() {
  const { tableId } = useParams()
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [vacantMsg, setVacantMsg] = useState('')
  const [error, setError] = useState('')
  const [menu, setMenu] = useState(null)
  const [editing, setEditing] = useState(null) // { order, line, item, initial }
  const [removing, setRemoving] = useState(null) // { order, line }
  const [removingBusy, setRemovingBusy] = useState(false)
  const [cancelling, setCancelling] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await staffApi.getTableSession(tableId)
      setSession(res.data)
      setVacantMsg('')
      setError('')
    } catch (e) {
      if (e.response?.status === 404) {
        setSession(null)
        setVacantMsg(errorMessage(e))
      } else {
        setError(errorMessage(e, 'Không tải được đơn của bàn.'))
      }
    }
  }, [tableId])
  usePolling(load, 5000)

  useEffect(() => {
    staffApi.getMenu().then((res) => setMenu(res.data)).catch(() => {})
  }, [])

  const openEdit = (order, line) => {
    if (!menu) return
    const item = findMenuItem(menu, line.menuItemId)
    if (!item) {
      toast('Món này hiện đang ngừng bán nên không sửa được. Bạn có thể bỏ món.', 'error')
      return
    }
    setEditing({
      order, line, item,
      initial: {
        quantity: line.quantity,
        sizeId: menu.sizes.find((s) => s.name === line.sizeName)?.id ?? null,
        toppingIds: (line.toppings || []).map((t) => t.id),
        sugarLevel: line.sugarLevel,
        iceLevel: line.iceLevel,
        note: line.note || '',
      },
    })
  }

  const saveEdit = async (line) => {
    try {
      await waiterApi.updateItem(editing.order.id, editing.line.id, toItemRequest(line))
      toast(`Đã cập nhật ${line.itemName}`)
      setEditing(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      load()
    }
  }

  const confirmRemove = async () => {
    setRemovingBusy(true)
    try {
      await waiterApi.removeItem(removing.order.id, removing.line.id)
      toast(`Đã bỏ ${removing.line.itemName} khỏi đơn ${removing.order.displayNumber}`)
      setRemoving(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setRemovingBusy(false)
      load()
    }
  }

  const confirmCancel = async (reason) => {
    await waiterApi.cancelOrder(cancelling.id, reason)
    toast(`Đã hủy đơn ${cancelling.displayNumber}`)
    setCancelling(null)
    load()
  }

  const back = (
    <Link to="/waiter" className="btn btn-link text-decoration-none px-0 mb-3 cf-muted">
      <i className="bi bi-arrow-left me-1" /> Sơ đồ bàn
    </Link>
  )

  if (vacantMsg) {
    return (
      <>
        {back}
        <div className="cf-card empty-state"><i className="bi bi-cup" />{vacantMsg}</div>
      </>
    )
  }
  if (!session) {
    return (
      <>
        {back}
        {error ? <div className="alert alert-danger">{error}</div>
          : <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}
      </>
    )
  }

  const activeOrders = session.orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED')
  const cancelledOrders = session.orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED')

  return (
    <>
      {back}
      <div className="mb-4">
        <h1 className="page-title">{session.tableNumber}</h1>
        <p className="page-subtitle">Lượt khách {session.sessionCode}, vào lúc {formatTime(session.openedAt)}</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-lg-8">
          {activeOrders.map((o) => {
            const editable = isWaiting(o.status)
            const lines = o.items.filter((i) => i.status !== 'CANCELLED')
            return (
              <div className="cf-card mb-3" key={o.id}>
                <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold">{o.displayNumber}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <span className="cell-sub">Gọi lúc {formatTime(o.createdAt)}</span>
                </div>
                <div className="px-3">
                  {lines.map((i) => (
                    <div className="order-line align-items-start" key={i.id}>
                      <span className="order-qty">{i.quantity}×</span>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold">{i.itemName}</div>
                        {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
                        {i.note && <div className="order-note">{i.note}</div>}
                      </div>
                      <div className="text-nowrap">{formatMoney(i.subtotal)}</div>
                      {editable && (
                        <div className="d-flex gap-1 ms-2">
                          <button type="button" className="btn btn-light-soft btn-icon" title="Sửa món" aria-label={`Sửa ${i.itemName}`}
                                  disabled={!menu} onClick={() => openEdit(o, i)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button type="button" className="btn btn-light-soft btn-icon" title="Bỏ món" aria-label={`Bỏ ${i.itemName}`}
                                  disabled={lines.length <= 1} onClick={() => setRemoving({ order: o, line: i })}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top">
                  <span className="cell-sub">
                    {editable ? 'Chưa pha: sửa được món hoặc hủy đơn.' : 'Đã bắt đầu pha, không sửa được nữa.'}
                  </span>
                  <div className="d-flex align-items-center gap-3">
                    <span className="fw-semibold">{formatMoney(o.totalAmount)}</span>
                    {editable && (
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setCancelling(o)}>Hủy đơn</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {cancelledOrders.length > 0 && (
            <div className="cf-card p-3 cell-sub">
              <div className="fw-semibold mb-1" style={{ color: 'var(--cf-text)' }}>Đơn đã hủy</div>
              {cancelledOrders.map((o) => (
                <div key={o.id}>{o.displayNumber}{o.cancelReason ? `: ${o.cancelReason}` : ''}</div>
              ))}
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="cf-card p-4">
            <div className="d-flex justify-content-between align-items-center">
              <span className="cf-muted">Tạm tính</span>
              <span className="fs-4 fw-bold">{formatMoney(session.total)}</span>
            </div>
            <hr />
            {session.payable
              ? <div className="small"><i className="bi bi-check-circle me-1" style={{ color: 'var(--cf-success)' }} />Đã phục vụ hết món, khách có thể ra quầy thanh toán.</div>
              : <div className="small cf-muted">Còn {session.unfinishedOrders.length} đơn chưa phục vụ xong: {session.unfinishedOrders.join(', ')}.</div>}
          </div>
        </div>
      </div>

      <ItemOptionsModal show={!!editing} item={editing?.item} options={menu} initial={editing?.initial}
                        confirmText="Lưu thay đổi" onClose={() => setEditing(null)} onConfirm={saveEdit} />
      <ConfirmModal show={!!removing} title="Bỏ món" loading={removingBusy} danger confirmText="Bỏ món"
                    message={removing && <>Bỏ <strong>{removing.line.quantity}× {removing.line.itemName}</strong> khỏi đơn {removing.order.displayNumber}?</>}
                    onClose={() => !removingBusy && setRemoving(null)} onConfirm={confirmRemove} />
      <CancelOrderModal show={!!cancelling} order={cancelling} placeholder="VD: Khách đổi ý"
                        onClose={() => setCancelling(null)} onConfirm={confirmCancel} />
    </>
  )
}
