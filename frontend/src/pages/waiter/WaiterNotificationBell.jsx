import { useCallback, useEffect, useRef, useState } from 'react'
import waiterApi from '../../api/waiterApi'
import { errorMessage } from '../../api/axiosClient'
import '../../styles/danmt.css'

// Danh sách id thông báo đã xem được lưu trên trình duyệt, riêng cho từng tài khoản.
function loadSeen(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

function saveSeen(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Trình duyệt chặn lưu thì bỏ qua, lần sau chuông vẫn báo lại
  }
}

/** Combines stock alerts with actionable table assistance calls. Viewing is separate from accepting. */
export default function WaiterNotificationBell({ userId }) {
  const storageKey = `waiter-seen-notifications-${userId}`
  const [list, setList] = useState([])
  const [calls, setCalls] = useState([])
  const [seen, setSeen] = useState([])
  const [newIds, setNewIds] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const sequence = useRef(0)

  const load = useCallback(async () => {
    const request = ++sequence.current
    const [stock, assistance] = await Promise.allSettled([
      waiterApi.getNotifications(), waiterApi.getAssistance(),
    ])
    if (request !== sequence.current) return
    if (stock.status === 'fulfilled') setList(stock.value.data)
    if (assistance.status === 'fulfilled') setCalls(assistance.value.data)
    const failed = [stock, assistance].find((result) => result.status === 'rejected')
    setError(failed ? errorMessage(failed.reason, 'Chưa tải được thông báo.') : '')
  }, [])

  useEffect(() => {
    setSeen(loadSeen(storageKey).map((id) => typeof id === 'number' ? `item:${id}` : id))
    setList([]); setCalls([]); setOpen(false)
    load()
    const timer = setInterval(load, 5000)
    return () => { clearInterval(timer); sequence.current += 1 }
  }, [storageKey, load])

  const allIds = [...list.map((n) => `item:${n.itemId}`), ...calls.map((n) => `call:${n.id}`)]
  const unreadCount = allIds.filter((id) => !seen.includes(id)).length
  const toggle = () => {
    if (!open) {
      setNewIds(allIds.filter((id) => !seen.includes(id)))
      setSeen(allIds)
      saveSeen(storageKey, allIds)
    }
    setOpen(!open)
  }
  const act = async (call, action) => {
    setBusy(call.id)
    setError('')
    sequence.current += 1
    try {
      if (action === 'accept') await waiterApi.acceptAssistance(call.id)
      else await waiterApi.completeAssistance(call.id)
      await load()
    } catch (e) {
      await load()
      setError(errorMessage(e))
    } finally { setBusy(null) }
  }
  return (
    <div className="waiter-bell">
      <button type="button" className="btn btn-light-soft btn-icon position-relative" onClick={toggle}
        aria-expanded={open} aria-label={`Thông báo, ${unreadCount} chưa xem`} title="Thông báo">
        <i className="bi bi-bell" />
        {unreadCount > 0 && <span className="waiter-bell-count">{unreadCount}</span>}
      </button>
      {open && <>
        <div className="waiter-bell-backdrop" onClick={() => setOpen(false)} />
        <div className="waiter-bell-menu">
          <div className="waiter-bell-head">Thông báo phục vụ</div>
          {error && <div className="text-danger p-2" role="alert">{error}</div>}
          {list.length === 0 && calls.length === 0 && <div className="cell-sub p-3">Chưa có thông báo nào.</div>}
          {calls.map((call) => <div key={`call:${call.id}`}
            className={`waiter-bell-item ${newIds.includes(`call:${call.id}`) ? 'is-new' : ''}`}>
            <i className="bi bi-bell text-warning me-2" />
            <div className="flex-grow-1">
              <div className="fw-semibold">{call.tableNumber} cần hỗ trợ</div>
              {call.note && <div className="cf-muted waiter-call-note">{call.note}</div>}
              <small className="cf-muted">{new Date(call.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
              {call.status === 'PENDING'
                ? <div><button type="button" className="btn btn-sm btn-primary mt-2" disabled={!!busy}
                    onClick={() => act(call, 'accept')}>Tiếp nhận</button></div>
                : <>
                    <div className="cf-muted">{call.acceptedByName || 'Nhân viên'} đã tiếp nhận</div>
                    {call.acceptedById === userId && <button type="button" className="btn btn-sm btn-success mt-2"
                      disabled={!!busy} onClick={() => act(call, 'complete')}>Hoàn tất</button>}
                  </>}
            </div>
          </div>)}
          {list.map((n) => <div key={`item:${n.itemId}`}
            className={`waiter-bell-item ${newIds.includes(`item:${n.itemId}`) ? 'is-new' : ''}`}>
            <i className="bi bi-exclamation-triangle text-danger me-2" />
            <div>
              <div className="fw-semibold">{n.tableNumber || 'Không rõ bàn'} · Đơn {n.displayNumber}</div>
              <div className="cf-muted">Đã hủy {n.quantity}× {n.itemName}, báo lại cho khách.</div>
            </div>
          </div>)}
        </div>
      </>}
    </div>
  )
}
