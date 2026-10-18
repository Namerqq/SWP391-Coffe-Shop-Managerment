import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import waiterApi from '../../api/waiterApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import ConfirmModal from '../../components/ConfirmModal'
import StatusPill from '../../components/order/StatusPill'
import { formatMoney, formatTime, isWaiting, itemOptionsText } from '../../utils/orderFormat'
import EditItemModal from './EditItemModal'
import CancelOrderModal from './CancelOrderModal'
import ChangeTableModal from './ChangeTableModal'
import '../../styles/danmt.css'

// Order Detail & Edit Pending Order (Waiter) — UC-W05, UC-W06, UC-W07, SRS #20 Change Table.
// Chỉ đơn "Chờ pha" mới sửa / bỏ món / hủy được (GB-02).
export default function WaiterTableDetail() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [vacantMsg, setVacantMsg] = useState('')
  const [error, setError] = useState('')
  const [menu, setMenu] = useState(null)
  const [editing, setEditing] = useState(null) // { order, line }
  const [removing, setRemoving] = useState(null) // { order, line }
  const [removingBusy, setRemovingBusy] = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const [changingTable, setChangingTable] = useState(false)

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

  const confirmRemove = async () => {
    setRemovingBusy(true)
    try {
      await waiterApi.removeItem(removing.order.id, removing.line.id)
      toast(`Đã bỏ ${removing.line.itemName}`)
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
    toast('Đã hủy món chưa pha của bàn')
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

  // Gộp tất cả các món đang hoạt động trong toàn bộ lượt khách của bàn
  const allActiveItems = []
  activeOrders.forEach((o) => {
    o.items
      .filter((i) => i.status !== 'CANCELLED')
      .forEach((i) => {
        allActiveItems.push({ ...i, order: o })
      })
  })

  const totalCups = allActiveItems.reduce((s, i) => s + (i.quantity || 1), 0)
  const servedCups = allActiveItems
    .filter((i) => i.status === 'SERVED')
    .reduce((s, i) => s + (i.quantity || 1), 0)
  const remainingCups = totalCups - servedCups
  const editableCount = allActiveItems.filter((i) => isWaiting(i.order.status)).length
  const waitingOrders = activeOrders.filter((o) => isWaiting(o.status))

  return (
    <>
      {back}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-3">
            <h1 className="page-title mb-0">{session.tableNumber}</h1>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              title="Đổi bàn cho khách"
              onClick={() => setChangingTable(true)}
            >
              <i className="bi bi-arrow-left-right me-1" /> Đổi bàn
            </button>
          </div>
          <p className="page-subtitle mt-1 mb-0">Lượt khách {session.sessionCode}, vào lúc {formatTime(session.openedAt)}</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="cf-card mb-3">
            <div className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom">
              <div>
                <span className="fw-bold fs-6">Danh sách món tại bàn</span>
                <span className="cell-sub ms-2">({allActiveItems.length} món • {totalCups} ly)</span>
              </div>
              <div>
                {servedCups === totalCups && totalCups > 0 ? (
                  <span className="status-pill tone-served">
                    <i className="bi bi-check2-all me-1" />Đã mang đủ {totalCups} ly
                  </span>
                ) : (
                  <span className="status-pill tone-pending">
                    Đã mang {servedCups}/{totalCups} ly
                  </span>
                )}
              </div>
            </div>

            <div className="px-3">
              {allActiveItems.length === 0 ? (
                <div className="py-4 text-center cell-sub">Chưa có món nào được gọi tại bàn này.</div>
              ) : (
                allActiveItems.map((i, idx) => {
                  const editable = isWaiting(i.order.status)
                  const lineItemsOfOrder = i.order.items.filter((x) => x.status !== 'CANCELLED')
                  return (
                    <div className="order-line align-items-start py-3" key={`${i.id}-${idx}`}>
                      <span className="order-qty fw-bold">{i.quantity}×</span>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center flex-wrap gap-2">
                          <span className="fw-semibold">{i.itemName}</span>
                          {i.status === 'SERVED' && (
                            <span className="status-pill tone-served" style={{ fontSize: '0.72rem' }}>Đã mang ra</span>
                          )}
                          {i.status === 'READY' && (
                            <span className="status-pill tone-ready" style={{ fontSize: '0.72rem' }}>Chờ mang ra</span>
                          )}
                          {(i.status === 'PENDING' || i.status === 'PREPARING') && (
                            <span className="status-pill tone-pending" style={{ fontSize: '0.72rem' }}>Đang pha</span>
                          )}
                          {i.note?.includes('[SỰ CỐ: PHA LẠI') && (
                            <span className="badge text-bg-danger" style={{ fontSize: '0.7rem' }}>🔥 Pha bù</span>
                          )}
                        </div>
                        {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
                        {i.note && <div className="order-note"><i className="bi bi-chat-left-text me-1" />{i.note}</div>}
                      </div>
                      <div className="text-nowrap fw-semibold">{formatMoney(i.subtotal)}</div>
                      {editable && (
                        <div className="d-flex gap-1 ms-2">
                          <button
                            type="button"
                            className="btn btn-light-soft btn-icon"
                            title="Sửa món"
                            aria-label={`Sửa ${i.itemName}`}
                            disabled={!menu}
                            onClick={() => setEditing({ order: i.order, line: i })}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-light-soft btn-icon"
                            title="Bỏ món"
                            aria-label={`Bỏ ${i.itemName}`}
                            disabled={lineItemsOfOrder.length <= 1}
                            onClick={() => setRemoving({ order: i.order, line: i })}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top">
              <span className="cell-sub">
                {editableCount > 0
                  ? `Có ${editableCount} món chưa pha, có thể sửa hoặc bỏ món.`
                  : 'Mọi món đã bắt đầu pha hoặc đã phục vụ.'}
              </span>
              <div className="d-flex align-items-center gap-2">
                {waitingOrders.length > 0 && (
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setCancelling(waitingOrders[0])}>
                    Hủy món chưa pha
                  </button>
                )}
              </div>
            </div>
          </div>

          {cancelledOrders.length > 0 && (
            <div className="cf-card p-3 cell-sub">
              <div className="fw-semibold mb-1" style={{ color: 'var(--cf-text)' }}>Món đã hủy</div>
              {cancelledOrders.map((o) => (
                <div key={o.id}>
                  {o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}
                  {o.cancelReason ? ` (Lý do: ${o.cancelReason})` : ''}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="cf-card p-4">
            <div className="d-flex justify-content-between align-items-center">
              <span className="cf-muted">Tạm tính bàn</span>
              <span className="fs-4 fw-bold">{formatMoney(session.total)}</span>
            </div>
            <hr />
            {remainingCups === 0 && totalCups > 0 ? (
              <div className="small text-success">
                <i className="bi bi-check-circle me-1" />
                Đã phục vụ hết {totalCups} ly, khách có thể ra quầy thanh toán.
              </div>
            ) : (
              <div className="small cf-muted">
                <i className="bi bi-hourglass-split me-1" />
                Còn {remainingCups} ly đang chuẩn bị / chờ mang ra.
              </div>
            )}
          </div>
        </div>
      </div>

      <EditItemModal
        show={!!editing}
        order={editing?.order}
        item={editing?.line}
        menuOptions={menu}
        onClose={() => setEditing(null)}
        onSuccess={() => {
          setEditing(null)
          load()
        }}
      />
      <ConfirmModal show={!!removing} title="Bỏ món" loading={removingBusy} danger confirmText="Bỏ món"
                    message={removing && <>Bỏ <strong>{removing.line.quantity}× {removing.line.itemName}</strong> khỏi bàn này?</>}
                    onClose={() => !removingBusy && setRemoving(null)} onConfirm={confirmRemove} />
      <CancelOrderModal show={!!cancelling} order={cancelling} placeholder="VD: Khách đổi ý"
                        onClose={() => setCancelling(null)} onConfirm={confirmCancel} />
      <ChangeTableModal show={changingTable} session={session} onClose={() => setChangingTable(false)}
                        onSuccess={(targetTable) => {
                          setChangingTable(false)
                          toast(`Đã chuyển lượt khách sang ${targetTable.tableNumber}`)
                          navigate(`/waiter/tables/${targetTable.tableId}`, { replace: true })
                        }} />
    </>
  )
}
