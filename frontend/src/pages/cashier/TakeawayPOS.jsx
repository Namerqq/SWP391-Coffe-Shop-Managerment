import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import ItemOptionsModal from '../../components/order/ItemOptionsModal'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { findMenuItem, toItemRequest, unitTotal } from '../../utils/orderOptions'
import PaymentModal from './PaymentModal'
import '../../styles/cashier.css'

// Take-away Order (Cashier POS) — SRS 1.3.3. UC-C01..C04. Khách trả tiền trước rồi đơn mới vào hàng chờ pha.
const plain = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()

const sameOptions = (a, b) => a.menuItemId === b.menuItemId && a.sizeId === b.sizeId
  && [...a.toppingIds].sort().join(',') === [...b.toppingIds].sort().join(',')
  && a.sugarLevel === b.sugarLevel && a.iceLevel === b.iceLevel && (a.note || '') === (b.note || '')

let lineSeq = 0

export default function TakeawayPOS() {
  const navigate = useNavigate()
  const toast = useToast()
  const [menu, setMenu] = useState(null)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [cat, setCat] = useState('ALL')
  const [cart, setCart] = useState([])
  const [picking, setPicking] = useState(null) // { item, key?, initial? }
  const [note, setNote] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    staffApi.getMenu()
      .then((res) => setMenu(res.data))
      .catch((e) => setError(errorMessage(e, 'Không tải được menu.')))
  }, [])

  const categories = useMemo(() => menu?.categories || [], [menu])
  const items = useMemo(() => {
    const kw = plain(keyword.trim())
    return categories
      .filter((c) => cat === 'ALL' || c.id === cat)
      .flatMap((c) => c.items)
      .filter((i) => !kw || plain(i.name).includes(kw))
  }, [categories, cat, keyword])

  const subtotal = cart.reduce((s, l) => s + unitTotal(l) * l.quantity, 0)
  const count = cart.reduce((s, l) => s + l.quantity, 0)

  const confirmLine = (line) => {
    const editingKey = picking?.key
    lineSeq += 1
    const newKey = `l${lineSeq}`
    setCart((cur) => {
      if (editingKey) return cur.map((l) => (l.key === editingKey ? { ...line, key: editingKey } : l))
      const same = cur.find((l) => sameOptions(l, line))
      if (same) return cur.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l))
      return [...cur, { ...line, key: newKey }]
    })
    setPicking(null)
  }

  const setQty = (key, delta) => setCart((cur) => cur.map((l) => (
    l.key === key ? { ...l, quantity: Math.min(50, Math.max(1, l.quantity + delta)) } : l)))
  const removeLine = (key) => setCart((cur) => cur.filter((l) => l.key !== key))
  const clearAll = () => { setCart([]); setNote('') }

  const editLine = (l) => setPicking({
    item: findMenuItem(menu, l.menuItemId) || { id: l.menuItemId, name: l.itemName, price: l.unitPrice },
    key: l.key,
    initial: l,
  })

  const paid = (result) => {
    setPaying(false)
    const no = result.orderNumber ? `#${result.orderNumber.split('-').pop()}` : ''
    toast(`Đã thu ${formatMoney(result.amount)}. Đơn ${no} đã gửi pha chế.`)
    clearAll()
    navigate(`/cashier/receipt/${result.paymentId}`)
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title">Bán mang đi</h1>
        <p className="page-subtitle">Khách trả tiền trước. Đơn mang đi không sửa hay hủy được sau khi thu tiền.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="pos-layout">
        <div className="cf-card p-3" style={{ minWidth: 0 }}>
          <div className="input-icon mb-3">
            <i className="bi bi-search" />
            <input className="form-control" placeholder="Tìm món (gõ không dấu cũng được)" value={keyword}
                   aria-label="Tìm món" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="chip-tabs mb-3" role="tablist" aria-label="Danh mục">
            <button type="button" role="tab" aria-selected={cat === 'ALL'} className={cat === 'ALL' ? 'active' : ''} onClick={() => setCat('ALL')}>Tất cả</button>
            {categories.map((c) => (
              <button type="button" role="tab" key={c.id} aria-selected={cat === c.id} className={cat === c.id ? 'active' : ''}
                      onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>

          {!menu && !error && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải menu...</div>}
          <div className="pos-grid">
            {items.map((i) => (
              <button type="button" key={i.id} className="pos-item" onClick={() => setPicking({ item: i })}>
                <span className="pos-item-name">{i.name}</span>
                <span className="pos-item-price">{formatMoney(i.price)}</span>
              </button>
            ))}
          </div>
          {menu && items.length === 0 && (
            <div className="empty-state py-4">{keyword ? 'Không tìm thấy món phù hợp.' : 'Chưa có món nào đang bán.'}</div>
          )}
        </div>

        <aside className="cf-card pos-cart">
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <span className="fw-semibold">Món đã chọn</span>
            <span className="cell-sub">{count} món</span>
          </div>
          <div className="px-3 pos-cart-lines">
            {cart.length === 0 && <div className="cell-sub py-3">Chưa có món nào. Bấm vào món để thêm.</div>}
            {cart.map((l) => (
              <div className="cart-line" key={l.key}>
                <div className="d-flex justify-content-between gap-2">
                  <button type="button" className="cart-line-name" title="Sửa lựa chọn" onClick={() => editLine(l)}>{l.itemName}</button>
                  <span className="text-nowrap fw-semibold">{formatMoney(unitTotal(l) * l.quantity)}</span>
                </div>
                {itemOptionsText(l) && <div className="cell-sub">{itemOptionsText(l)}</div>}
                {l.note && <div className="order-note">{l.note}</div>}
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <div className="qty-stepper">
                    <button type="button" aria-label="Giảm" disabled={l.quantity <= 1} onClick={() => setQty(l.key, -1)}>−</button>
                    <span>{l.quantity}</span>
                    <button type="button" aria-label="Tăng" disabled={l.quantity >= 50} onClick={() => setQty(l.key, 1)}>+</button>
                  </div>
                  <button type="button" className="btn btn-link btn-sm p-0 cart-remove" onClick={() => removeLine(l.key)}>Bỏ món</button>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="px-3 pt-2">
              <input className="form-control form-control-sm" placeholder="Ghi chú cho cả đơn (không bắt buộc)" maxLength={500}
                     value={note} aria-label="Ghi chú cho cả đơn" onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span>Tạm tính</span>
              <span className="fs-4 fw-bold">{formatMoney(subtotal)}</span>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light-soft" disabled={cart.length === 0} onClick={clearAll}>Xóa hết</button>
              <button type="button" className="btn btn-primary flex-grow-1 py-2" disabled={cart.length === 0} onClick={() => setPaying(true)}>
                Thanh toán
              </button>
            </div>
          </div>
        </aside>
      </div>

      <ItemOptionsModal show={!!picking} item={picking?.item} options={menu} initial={picking?.initial}
                        confirmText={picking?.key ? 'Cập nhật' : 'Thêm vào đơn'}
                        onClose={() => setPicking(null)} onConfirm={confirmLine} />
      <PaymentModal show={paying} title="Thanh toán đơn mang đi" subtotal={subtotal} transferNote="Mang di"
                    onClose={() => setPaying(false)}
                    onSubmit={(payload) => cashierApi.takeaway({ ...payload, items: cart.map(toItemRequest), note: note.trim() || null })}
                    onPaid={paid} />
    </>
  )
}
