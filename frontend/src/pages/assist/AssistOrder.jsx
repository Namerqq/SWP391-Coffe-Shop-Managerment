import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import assistOrderApi from '../../api/assistOrderApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import ItemOptionsModal from '../../components/order/ItemOptionsModal'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { findMenuItem, toItemRequest, unitTotal } from '../../utils/orderOptions'
import { plainText, sameOptions } from '../../utils/guestSession'
import '../../styles/assist.css'

let lineSeq = 0

// Assist Order (Waiter) — SRS 1.4, UC-W01 Place Assisted Orders. Mở nhanh cho 1 bàn: /waiter/assist-order?table=<tableId>
export default function AssistOrder() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [tables, setTables] = useState([])
  const [tableId, setTableId] = useState(params.get('table') ? Number(params.get('table')) : null)
  const [menu, setMenu] = useState(null)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [cat, setCat] = useState('ALL')
  const [cart, setCart] = useState([])
  const [note, setNote] = useState('')
  const [picking, setPicking] = useState(null)
  const [sending, setSending] = useState(false)
  const [last, setLast] = useState(null)

  const loadTables = useCallback(() => {
    staffApi.getTables().then((res) => setTables(res.data)).catch((e) => setError(errorMessage(e, 'Không tải được danh sách bàn.')))
  }, [])
  useEffect(() => {
    loadTables()
    staffApi.getMenu().then((res) => setMenu(res.data)).catch((e) => setError(errorMessage(e, 'Không tải được menu.')))
  }, [loadTables])

  const categories = useMemo(() => menu?.categories || [], [menu])
  const items = useMemo(() => {
    const kw = plainText(keyword.trim())
    return categories.filter((c) => cat === 'ALL' || c.id === cat).flatMap((c) => c.items)
      .filter((i) => !kw || plainText(i.name).includes(kw))
  }, [categories, cat, keyword])

  const table = tables.find((t) => t.tableId === tableId) || null
  const total = cart.reduce((s, l) => s + unitTotal(l) * l.quantity, 0)
  const count = cart.reduce((s, l) => s + l.quantity, 0)

  const confirmLine = (line) => {
    const editingKey = picking?.key
    lineSeq += 1
    const key = `a${lineSeq}`
    setCart((cur) => {
      if (editingKey) return cur.map((l) => (l.key === editingKey ? { ...line, key: editingKey } : l))
      const same = cur.find((l) => sameOptions(l, line))
      if (same) return cur.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l))
      return [...cur, { ...line, key }]
    })
    setPicking(null)
  }
  const setQty = (key, delta) => setCart((cur) => cur.map((l) => (
    l.key === key ? { ...l, quantity: Math.min(50, Math.max(1, l.quantity + delta)) } : l)))

  const send = async () => {
    setSending(true)
    try {
      const res = await assistOrderApi.create({ tableId, items: cart.map(toItemRequest), note: note.trim() || null })
      toast(`Đã gửi đơn ${res.data.displayNumber} cho ${res.data.tableNumber}`)
      setLast(res.data)
      setCart([])
      setNote('')
      loadTables()
    } catch (e) {
      toast(errorMessage(e, 'Gửi đơn thất bại.'), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="mb-3">
        <h1 className="page-title">Gọi món giúp khách</h1>
        <p className="page-subtitle">Chọn bàn, thêm món rồi gửi. Đơn vào hàng Chờ pha giống đơn khách tự gọi bằng QR.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {last && (
        <div className="as-done" role="status">
          <i className="bi bi-check-circle" />
          <span>Đã gửi đơn <strong>{last.displayNumber}</strong> cho {last.tableNumber}.</span>
          <Link to={`/waiter/tables/${last.tableId}`}>Xem bàn</Link>
          <button type="button" className="btn-close ms-auto" aria-label="Đóng" onClick={() => setLast(null)} />
        </div>
      )}

      <section className="cf-card p-3 mb-3" aria-label="Chọn bàn">
        <div className="as-step">1. Chọn bàn</div>
        <div className="as-tables">
          {tables.map((t) => (
            <button type="button" key={t.tableId} aria-pressed={tableId === t.tableId}
                    className={`as-table ${tableId === t.tableId ? 'active' : ''} ${t.sessionId ? 'busy' : ''}`}
                    onClick={() => setTableId(t.tableId)}>
              <b>{t.tableNumber}</b><small>{t.sessionId ? `${t.orderCount} đơn` : 'Trống'}</small>
            </button>
          ))}
          {tables.length === 0 && !error && <span className="cell-sub">Chưa có bàn nào đang hoạt động.</span>}
        </div>
      </section>

      <div className="as-layout">
        <section className="cf-card p-3" style={{ minWidth: 0 }} aria-label="Thực đơn">
          <div className="as-step">2. Chọn món</div>
          <div className="input-icon mb-3">
            <i className="bi bi-search" />
            <input className="form-control" placeholder="Tìm món (gõ không dấu cũng được)" aria-label="Tìm món"
                   value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="chip-tabs mb-3" role="tablist" aria-label="Danh mục">
            <button type="button" role="tab" aria-selected={cat === 'ALL'} className={cat === 'ALL' ? 'active' : ''} onClick={() => setCat('ALL')}>Tất cả</button>
            {categories.map((c) => (
              <button type="button" role="tab" key={c.id} aria-selected={cat === c.id} className={cat === c.id ? 'active' : ''}
                      onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>
          {!menu && !error && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải menu...</div>}
          <div className="as-grid">
            {items.map((i) => (
              <button type="button" key={i.id} className="as-item" onClick={() => setPicking({ item: i })}>
                <span className="as-item-name">{i.name}</span>
                <span className="cell-sub">{formatMoney(i.price)}</span>
              </button>
            ))}
          </div>
          {menu && items.length === 0 && <div className="empty-state py-4">Không có món phù hợp.</div>}
        </section>

        <aside className="cf-card as-cart" aria-label="Món đã chọn">
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <span className="fw-semibold">3. Món đã chọn</span>
            <span className="cell-sub">{count} món</span>
          </div>
          <div className="px-3 as-cart-lines">
            {cart.length === 0 && <div className="cell-sub py-3">Chưa có món nào. Bấm vào món để thêm.</div>}
            {cart.map((l) => (
              <div className="as-line" key={l.key}>
                <div className="d-flex justify-content-between gap-2">
                  <button type="button" className="as-line-name" title="Sửa lựa chọn"
                          onClick={() => setPicking({ item: findMenuItem(menu, l.menuItemId) || { id: l.menuItemId, name: l.itemName, price: l.unitPrice }, key: l.key, initial: l })}>
                    {l.itemName}
                  </button>
                  <span className="fw-semibold text-nowrap">{formatMoney(unitTotal(l) * l.quantity)}</span>
                </div>
                {itemOptionsText(l) && <div className="cell-sub">{itemOptionsText(l)}</div>}
                {l.note && <div className="order-note">{l.note}</div>}
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <div className="qty-stepper">
                    <button type="button" aria-label="Giảm" disabled={l.quantity <= 1} onClick={() => setQty(l.key, -1)}>−</button>
                    <span>{l.quantity}</span>
                    <button type="button" aria-label="Tăng" disabled={l.quantity >= 50} onClick={() => setQty(l.key, 1)}>+</button>
                  </div>
                  <button type="button" className="btn btn-link btn-sm p-0 as-remove" onClick={() => setCart((cur) => cur.filter((x) => x.key !== l.key))}>Bỏ món</button>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="px-3 pt-2">
              <input className="form-control form-control-sm" placeholder="Ghi chú cho cả đơn (không bắt buộc)" maxLength={500}
                     aria-label="Ghi chú cho cả đơn" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span>Tạm tính</span><span className="fs-4 fw-bold">{formatMoney(total)}</span>
            </div>
            <button type="button" className="btn btn-primary w-100 py-2" disabled={!table || cart.length === 0 || sending} onClick={send}>
              {sending && <span className="spinner-border spinner-border-sm me-2" />}
              {table ? `Gửi đơn cho ${table.tableNumber}` : 'Chọn bàn để gửi đơn'}
            </button>
          </div>
        </aside>
      </div>

      <ItemOptionsModal show={!!picking} item={picking?.item} options={menu} initial={picking?.initial}
                        confirmText={picking?.key ? 'Cập nhật' : 'Thêm vào đơn'}
                        onClose={() => setPicking(null)} onConfirm={confirmLine} />
    </>
  )
}
