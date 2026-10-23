import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import assistOrderApi from '../../api/assistOrderApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import ItemOptionsModal from '../../components/order/ItemOptionsModal'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { findMenuItem, toItemRequest, unitTotal } from '../../utils/orderOptions'
import { plainText, sameOptions } from '../../utils/guestSession'
import '../../styles/assist.css'

let lineSeq = 0 // đánh số từng dòng trong giỏ để làm key

// Assist Order (Waiter) — UC-W01 Place Assisted Orders: View Menu, Select and customize item, Submit Placed Orders.
// Mở từ chi tiết bàn (/waiter/tables/:tableId/order). Luồng giống khách tự gọi món tại bàn:
// chọn món -> chọn size / đường / đá / topping -> thêm vào giỏ -> gửi đơn (đơn vào hàng Chờ pha của pha chế).
export default function WaiterAssistOrder() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [tableName, setTableName] = useState('')
  const [menu, setMenu] = useState(null)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [cat, setCat] = useState('ALL')
  const [cart, setCart] = useState([])
  const [note, setNote] = useState('')
  const [picking, setPicking] = useState(null) // { item, key?, initial? } món đang mở để chọn tùy chọn
  const [sending, setSending] = useState(false)

  // Tải tên bàn và menu khi mở trang
  useEffect(() => {
    staffApi.getTables()
      .then((res) => {
        const table = res.data.find((t) => String(t.tableId) === String(tableId))
        setTableName(table ? table.tableNumber : '')
      })
      .catch(() => {})
    staffApi.getMenu()
      .then((res) => setMenu(res.data))
      .catch((e) => setError(errorMessage(e, 'Không tải được menu.')))
  }, [tableId])

  // Lọc món theo danh mục đang chọn và từ khóa tìm kiếm (gõ không dấu cũng được)
  const categories = menu ? menu.categories : []
  const kw = plainText(keyword.trim())
  const items = []
  categories.forEach((c) => {
    if (cat !== 'ALL' && c.id !== cat) return
    c.items.forEach((i) => {
      if (!kw || plainText(i.name).includes(kw)) items.push(i)
    })
  })

  let total = 0
  let count = 0
  cart.forEach((l) => {
    total += unitTotal(l) * l.quantity
    count += l.quantity
  })

  // Bấm "Thêm vào đơn" / "Cập nhật" trong hộp chọn tùy chọn
  const confirmLine = (line) => {
    if (picking.key) {
      // Đang sửa 1 dòng có sẵn trong giỏ
      setCart(cart.map((l) => (l.key === picking.key ? { ...line, key: picking.key } : l)))
    } else {
      // Món mới: nếu đã có dòng giống hệt thì cộng dồn số lượng, chưa có thì thêm dòng mới
      const same = cart.find((l) => sameOptions(l, line))
      if (same) {
        setCart(cart.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l)))
      } else {
        lineSeq += 1
        setCart([...cart, { ...line, key: `w${lineSeq}` }])
      }
    }
    setPicking(null)
  }

  const changeQty = (key, delta) => {
    setCart(cart.map((l) => {
      if (l.key !== key) return l
      const qty = Math.min(50, Math.max(1, l.quantity + delta))
      return { ...l, quantity: qty }
    }))
  }

  const removeLine = (key) => setCart(cart.filter((l) => l.key !== key))

  const editLine = (l) => {
    const item = findMenuItem(menu, l.menuItemId) || { id: l.menuItemId, name: l.itemName, price: l.unitPrice }
    setPicking({ item, key: l.key, initial: l })
  }

  const send = async () => {
    setSending(true)
    try {
      const res = await assistOrderApi.create({
        tableId: Number(tableId),
        items: cart.map(toItemRequest),
        note: note.trim() || null,
      })
      toast(`Đã gửi đơn ${res.data.displayNumber} cho ${res.data.tableNumber}, đơn đã vào hàng Chờ pha`)
      navigate(`/waiter/tables/${tableId}`)
    } catch (e) {
      toast(errorMessage(e, 'Gửi đơn thất bại.'), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Link to={`/waiter/tables/${tableId}`} className="btn btn-link text-decoration-none px-0 mb-3 cf-muted">
        <i className="bi bi-arrow-left me-1" /> Quay lại {tableName || 'bàn'}
      </Link>

      <div className="mb-3">
        <h1 className="page-title">Hỗ trợ đặt món{tableName && ` · ${tableName}`}</h1>
        <p className="page-subtitle">Chọn món cho khách, chỉnh size / đường / đá / topping rồi gửi. Đơn vào hàng Chờ pha giống đơn khách tự gọi bằng QR.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="as-layout">
        <section className="cf-card p-3" style={{ minWidth: 0 }} aria-label="Thực đơn">
          <div className="as-step">1. Chọn món</div>
          <div className="input-icon mb-3">
            <i className="bi bi-search" />
            <input className="form-control" placeholder="Tìm món (gõ không dấu cũng được)" aria-label="Tìm món"
                   value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="chip-tabs mb-3" role="tablist" aria-label="Danh mục">
            <button type="button" role="tab" aria-selected={cat === 'ALL'} className={cat === 'ALL' ? 'active' : ''}
                    onClick={() => setCat('ALL')}>Tất cả</button>
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
            <span className="fw-semibold">2. Món đã chọn</span>
            <span className="cell-sub">{count} món</span>
          </div>
          <div className="px-3 as-cart-lines">
            {cart.length === 0 && <div className="cell-sub py-3">Chưa có món nào. Bấm vào món để thêm.</div>}
            {cart.map((l) => (
              <div className="as-line" key={l.key}>
                <div className="d-flex justify-content-between gap-2">
                  <button type="button" className="as-line-name" title="Sửa lựa chọn" onClick={() => editLine(l)}>
                    {l.itemName}
                  </button>
                  <span className="fw-semibold text-nowrap">{formatMoney(unitTotal(l) * l.quantity)}</span>
                </div>
                {itemOptionsText(l) && <div className="cell-sub">{itemOptionsText(l)}</div>}
                {l.note && <div className="order-note">{l.note}</div>}
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <div className="qty-stepper">
                    <button type="button" aria-label="Giảm" disabled={l.quantity <= 1} onClick={() => changeQty(l.key, -1)}>−</button>
                    <span>{l.quantity}</span>
                    <button type="button" aria-label="Tăng" disabled={l.quantity >= 50} onClick={() => changeQty(l.key, 1)}>+</button>
                  </div>
                  <button type="button" className="btn btn-link btn-sm p-0 as-remove" onClick={() => removeLine(l.key)}>Bỏ món</button>
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
            <button type="button" className="btn btn-primary w-100 py-2" disabled={cart.length === 0 || sending} onClick={send}>
              {sending && <span className="spinner-border spinner-border-sm me-2" />}
              Gửi đơn{tableName && ` cho ${tableName}`}
            </button>
          </div>
        </aside>
      </div>

      <ItemOptionsModal show={!!picking} item={picking ? picking.item : null} options={menu}
                        initial={picking ? picking.initial : null}
                        confirmText={picking && picking.key ? 'Cập nhật' : 'Thêm vào đơn'}
                        onClose={() => setPicking(null)} onConfirm={confirmLine} />
    </>
  )
}
