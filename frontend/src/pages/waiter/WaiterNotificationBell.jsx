import { useEffect, useState } from 'react'
import waiterApi from '../../api/waiterApi'
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

/** Chuông thông báo của phục vụ: món bị pha chế hủy vì hết nguyên liệu, cần báo lại cho khách. */
export default function WaiterNotificationBell({ userId }) {
  const storageKey = `waiter-seen-notifications-${userId}`
  const [list, setList] = useState([])
  const [seen, setSeen] = useState(() => loadSeen(storageKey))
  const [newIds, setNewIds] = useState([]) // thông báo mới lúc vừa mở chuông, để tô nổi bật
  const [open, setOpen] = useState(false)

  // Lấy thông báo ngay khi vào trang, sau đó cứ 5 giây lấy lại 1 lần
  useEffect(() => {
    const load = () => {
      waiterApi.getNotifications()
        .then((res) => setList(res.data))
        .catch(() => {})
    }
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  const unreadCount = list.filter((n) => !seen.includes(n.itemId)).length

  const toggle = () => {
    if (!open) {
      // Mở chuông = đã xem hết các thông báo đang có
      const allIds = list.map((n) => n.itemId)
      setNewIds(allIds.filter((id) => !seen.includes(id)))
      setSeen(allIds)
      saveSeen(storageKey, allIds)
    }
    setOpen(!open)
  }

  return (
    <div className="waiter-bell">
      <button type="button" className="btn btn-light-soft btn-icon position-relative" onClick={toggle}
              aria-label={`Thông báo, ${unreadCount} chưa xem`} title="Thông báo">
        <i className="bi bi-bell" />
        {unreadCount > 0 && <span className="waiter-bell-count">{unreadCount}</span>}
      </button>

      {open && (
        <>
          {/* Lớp trong suốt phủ màn hình: bấm ra ngoài thì đóng chuông */}
          <div className="waiter-bell-backdrop" onClick={() => setOpen(false)} />
          <div className="waiter-bell-menu">
            <div className="waiter-bell-head">Món bị hủy vì hết nguyên liệu</div>
            {list.length === 0 && <div className="cell-sub p-3">Chưa có thông báo nào hôm nay.</div>}
            {list.map((n) => (
              <div key={n.itemId} className={`waiter-bell-item ${newIds.includes(n.itemId) ? 'is-new' : ''}`}>
                <i className="bi bi-exclamation-triangle text-danger me-2" />
                <div>
                  <div className="fw-semibold">{n.tableNumber || 'Không rõ bàn'} · Đơn {n.displayNumber}</div>
                  <div className="cf-muted">Đã hủy {n.quantity}× {n.itemName}, báo lại cho khách.</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
