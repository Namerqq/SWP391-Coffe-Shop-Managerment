import { useCallback, useMemo, useState } from 'react'
import baristaApi from '../../api/baristaApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import { elapsedLabel, isWaiting, itemOptionsText, placeLabel } from '../../utils/orderFormat'
import BaristaOrderModal from './BaristaOrderModal'
import RecipeModal from './RecipeModal'
import CancelOrderModal from '../waiter/CancelOrderModal'
import '../../styles/danmt.css'

// Barista Dashboard + Order Queue (Kanban) — SRS 1.5.1.1 / 1.5.1.2. UC-B01, UC-B03.
const COLUMNS = [
  { key: 'pending', label: 'Chờ pha', tone: 'pending', test: (o) => isWaiting(o.status), empty: 'Chưa có đơn mới' },
  { key: 'preparing', label: 'Đang pha', tone: 'preparing', test: (o) => o.status === 'PREPARING', empty: 'Chưa pha đơn nào' },
  { key: 'ready', label: 'Chờ mang ra', tone: 'ready', test: (o) => o.status === 'READY', empty: 'Không có món chờ mang ra' },
]

const activeItems = (o) => o.items.filter((i) => i.status !== 'CANCELLED')

export default function BaristaBoard() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [busyItemId, setBusyItemId] = useState(null) // món đang gửi lệnh tích / bỏ tích
  const [selected, setSelected] = useState(null) // tên món đang chọn ở "Tổng cần pha"
  const [detailId, setDetailId] = useState(null)
  const [recipeFor, setRecipeFor] = useState(null) // { menuItemId, itemName }
  const [cancelling, setCancelling] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await baristaApi.getBoard()
      setOrders(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách đơn.'))
    } finally {
      setLoading(false)
    }
  }, [])
  usePolling(load, 5000)

  // Tổng cần pha: gộp các món chưa pha xong (chưa tích) của đơn Chờ pha + Đang pha
  const summary = useMemo(() => {
    const map = new Map()
    orders.filter((o) => isWaiting(o.status) || o.status === 'PREPARING').forEach((o) => {
      activeItems(o).filter((i) => i.status !== 'READY').forEach((i) => {
        const cur = map.get(i.itemName) || { name: i.itemName, total: 0, sizes: {}, orderIds: new Set() }
        cur.total += i.quantity
        const size = i.sizeName || ''
        cur.sizes[size] = (cur.sizes[size] || 0) + i.quantity
        cur.orderIds.add(o.id)
        map.set(i.itemName, cur)
      })
    })
    return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'vi'))
  }, [orders])

  const totalCups = summary.reduce((s, x) => s + x.total, 0)
  const workingCount = orders.filter((o) => isWaiting(o.status) || o.status === 'PREPARING').length
  const sel = summary.find((x) => x.name === selected) || null
  const detail = orders.find((o) => o.id === detailId) || null

  const advance = async (order, action) => {
    setBusyId(order.id)
    try {
      if (action === 'start') await baristaApi.start(order.id)
      else await baristaApi.ready(order.id)
      toast(action === 'start' ? `Bắt đầu pha đơn ${order.displayNumber}` : `Đơn ${order.displayNumber} đã pha xong, đã báo mang ra`)
      setDetailId(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusyId(null)
      load()
    }
  }

  // Tích từng món đã pha xong. Tích đủ mọi món thì backend tự chuyển đơn sang "Chờ mang ra".
  const toggleItem = async (order, item) => {
    setBusyItemId(item.id)
    try {
      const res = await baristaApi.checkItem(order.id, item.id, item.status !== 'READY')
      setOrders((list) => list.map((x) => (x.id === res.data.id ? res.data : x)))
      if (res.data.status === 'READY') toast(`Đơn ${order.displayNumber} đã pha xong, đã báo mang ra`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      load()
    } finally {
      setBusyItemId(null)
    }
  }

  const confirmCancel = async (reason) => {
    await baristaApi.cancel(cancelling.id, reason)
    toast(`Đã hủy đơn ${cancelling.displayNumber}`)
    setCancelling(null)
    setDetailId(null)
    load()
  }

  const sizeText = (sizes) => Object.entries(sizes)
    .map(([name, qty]) => (name ? `${name} ${qty}` : `${qty} ly`)).join(', ')

  const renderCard = (o, col) => {
    const highlighted = sel && sel.orderIds.has(o.id)
    const canCheck = col.key === 'preparing'
    const items = activeItems(o)
    const doneCount = items.filter((i) => i.status === 'READY').length
    return (
      <article key={o.id} className={`kds-card tone-${col.tone} ${highlighted ? 'highlight' : ''}`}>
        <header className="kds-card-head">
          <button type="button" className="kds-no" onClick={() => setDetailId(o.id)} title="Xem chi tiết đơn">{o.displayNumber}</button>
          <span className="kds-place">{placeLabel(o)}</span>
          <span className="kds-time"><i className="bi bi-clock me-1" />{elapsedLabel(o.createdAt)}</span>
        </header>
        <ul className="kds-items">
          {items.map((i) => (
            <li key={i.id} className={`${sel && sel.name === i.itemName ? 'match' : ''} ${canCheck && i.status === 'READY' ? 'done' : ''}`}>
              {canCheck && (
                <input type="checkbox" className="form-check-input kds-check" checked={i.status === 'READY'}
                       disabled={busyItemId === i.id} onChange={() => toggleItem(o, i)}
                       aria-label={`Đã pha xong ${i.itemName}`} title="Tích khi pha xong món này" />
              )}
              <span className="order-qty">{i.quantity}×</span>
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="fw-semibold">{i.itemName}</div>
                {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
                {i.note && <div className="order-note"><i className="bi bi-chat-left-text me-1" />{i.note}</div>}
              </div>
              <button type="button" className="btn btn-light-soft btn-icon" title="Xem công thức"
                      aria-label={`Công thức ${i.itemName}`} onClick={() => setRecipeFor(i)}>
                <i className="bi bi-journal-text" />
              </button>
            </li>
          ))}
        </ul>
        {o.customerNote && <div className="order-note px-3 pb-2"><i className="bi bi-info-circle me-1" />{o.customerNote}</div>}
        {col.key === 'pending' && (
          <div className="kds-actions">
            <button type="button" className="btn btn-primary w-100" disabled={busyId === o.id} onClick={() => advance(o, 'start')}>
              Bắt đầu pha
            </button>
            <button type="button" className="btn btn-link kds-cancel" onClick={() => setCancelling(o)}>Hết nguyên liệu, hủy đơn</button>
          </div>
        )}
        {col.key === 'preparing' && (
          <div className="kds-actions">
            <div className="kds-progress">
              <i className="bi bi-check2-square me-1" />Đã pha {doneCount}/{items.length} món
            </div>
            <button type="button" className="btn btn-ready w-100" disabled={busyId === o.id} onClick={() => advance(o, 'ready')}>
              Pha xong, báo mang ra
            </button>
          </div>
        )}
        {col.key === 'ready' && <div className="kds-waiting"><i className="bi bi-check2-circle me-1" />Chờ mang ra</div>}
      </article>
    )
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title">Đơn cần pha</h1>
        <p className="page-subtitle">Tự cập nhật mỗi 5 giây. Đơn đến trước nằm trên cùng.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="kds-layout">
        <aside className="cf-card kds-summary">
          <div className="p-3 border-bottom">
            <div className="fw-semibold">Tổng cần pha</div>
            <div className="cell-sub">{totalCups} món, {workingCount} đơn</div>
          </div>
          <div className="p-2">
            {summary.map((x) => (
              <button type="button" key={x.name} className={`kds-sum-item ${selected === x.name ? 'active' : ''}`}
                      onClick={() => setSelected(selected === x.name ? null : x.name)}>
                <span className="flex-grow-1 text-start" style={{ minWidth: 0 }}>
                  <span className="fw-semibold d-block text-truncate">{x.name}</span>
                  <span className="cell-sub">{sizeText(x.sizes)}</span>
                </span>
                <span className="kds-sum-qty">{x.total}</span>
              </button>
            ))}
            {!loading && summary.length === 0 && <div className="cell-sub p-2">Chưa có món nào cần pha.</div>}
          </div>
          <div className="cell-sub px-3 pb-3">Gồm các món chưa pha xong của đơn chờ pha và đang pha. Bấm vào món để xem món đó nằm ở đơn nào.</div>
        </aside>

        <div style={{ minWidth: 0 }}>
          {sel && (
            <div className="kds-banner">
              <span>Đang xem <strong>{sel.name}</strong>: cần {sel.total}, nằm ở {sel.orderIds.size} đơn</span>
              <button type="button" className="btn btn-light-soft btn-sm" onClick={() => setSelected(null)}>
                <i className="bi bi-x-lg me-1" />Bỏ chọn
              </button>
            </div>
          )}
          <div className="kds-columns">
            {COLUMNS.map((col) => {
              const list = orders.filter(col.test)
              return (
                <section key={col.key} className={`tone-${col.tone}`} aria-label={col.label}>
                  <div className="kds-col-head"><span>{col.label}</span><span className="count">{list.length}</span></div>
                  {list.map((o) => renderCard(o, col))}
                  {!loading && list.length === 0 && <div className="cell-sub py-2">{col.empty}</div>}
                </section>
              )
            })}
          </div>
        </div>
      </div>

      <BaristaOrderModal order={detail} busy={detail && busyId === detail.id} onClose={() => setDetailId(null)}
                         onStart={(o) => advance(o, 'start')} onReady={(o) => advance(o, 'ready')}
                         onCancel={(o) => setCancelling(o)} onRecipe={(i) => setRecipeFor(i)} />
      <RecipeModal target={recipeFor} onClose={() => setRecipeFor(null)} />
      <CancelOrderModal show={!!cancelling} order={cancelling} title="Hủy đơn" required
                        label="Nguyên liệu bị thiếu" placeholder="VD: Hết sữa tươi"
                        message="Theo quy trình BF-02: không đủ nguyên liệu thì hủy đơn để phục vụ báo lại cho khách. Chỉ hủy được đơn chưa bắt đầu pha."
                        onClose={() => setCancelling(null)} onConfirm={confirmCancel} />
    </>
  )
}
