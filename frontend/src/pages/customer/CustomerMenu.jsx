import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import selfOrderApi from '../../api/selfOrderApi'
import AppModal from '../../components/AppModal'
import ItemCustomizeModal from '../../components/customer/ItemCustomizeModal'
import CartModal, { describeLine } from '../../components/customer/CartModal'
import { formatVnd, getErrorMessage, initial } from '../../utils/format'

// Giỏ hàng lưu theo từng bàn để F5 không mất. Bọc try/catch vì trình duyệt có thể chặn storage.
const cartKey = (qr) => `cart:${qr}`
const loadCart = (qr) => {
  try { return JSON.parse(localStorage.getItem(cartKey(qr))) || [] } catch { return [] }
}
const saveCart = (qr, cart) => {
  try { localStorage.setItem(cartKey(qr), JSON.stringify(cart)) } catch { /* bỏ qua */ }
}

// 2 dòng cùng món + cùng tuỳ chọn thì gộp lại thành 1
const lineKey = (l) => [l.menuItemId, l.sugarLevel, l.iceLevel, l.note].join('|')

// Màn 1.0.1 Customer menu - UC-CU01 View Menu, UC-CU02 Place Self-Order, UC-CU03 Select Order Item
// URL: /order/:qrCode  (qr_code của bàn, vd /order/TABLE-01)
export default function CustomerMenu() {
  const { qrCode } = useParams()
  const [table, setTable] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState('')
  const [activeCat, setActiveCat] = useState(null)

  const [cart, setCart] = useState(() => loadCart(qrCode))
  const [customizing, setCustomizing] = useState(null) // { item, line }
  const [showCart, setShowCart] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)

  const sectionRefs = useRef({})

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [tableRes, menuRes] = await Promise.all([selfOrderApi.getTable(qrCode), selfOrderApi.getMenu()])
        setTable(tableRes.data)
        setMenu(menuRes.data)
        setActiveCat(menuRes.data[0]?.id ?? null)
      } catch (err) {
        setFatalError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [qrCode])

  useEffect(() => { saveCart(qrCode, cart) }, [qrCode, cart])

  const allItems = useMemo(() => menu.flatMap((c) => c.items), [menu])
  const cartCount = cart.reduce((n, l) => n + l.quantity, 0)
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  const scrollToCategory = (id) => {
    setActiveCat(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Thêm mới hoặc cập nhật dòng trong giỏ
  const handleConfirmItem = (newLine) => {
    const editing = customizing?.line
    setCart((prev) => {
      let list = editing ? prev.filter((l) => l.key !== editing.key) : [...prev]
      const key = lineKey(newLine)
      const existing = list.find((l) => l.key === key)
      if (existing) {
        list = list.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + newLine.quantity) } : l))
      } else {
        list.push({ ...newLine, key })
      }
      return list
    })
    setCustomizing(null)
    if (editing) setShowCart(true)
  }

  const changeQty = (key, qty) =>
    setCart((prev) => (qty <= 0
      ? prev.filter((l) => l.key !== key)
      : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, qty) } : l))))

  const editLine = (line) => {
    const item = allItems.find((i) => i.id === line.menuItemId)
    if (!item) return setSubmitError(`Món "${line.name}" không còn trên menu, vui lòng xóa khỏi giỏ`)
    setShowCart(false)
    setCustomizing({ item, line })
  }

  // UC-CU02: gửi đơn. Không gửi giá — server tự tính.
  const submitOrder = async () => {
    try {
      setSubmitting(true)
      setSubmitError('')
      const res = await selfOrderApi.placeOrder({
        qrCode,
        items: cart.map((l) => ({
          menuItemId: l.menuItemId, quantity: l.quantity,
          sugarLevel: l.sugarLevel, iceLevel: l.iceLevel, note: l.note || null,
        })),
      })
      setPlacedOrder(res.data)
      setCart([])
      setShowCart(false)
    } catch (err) {
      setSubmitError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="cus-page d-flex align-items-center justify-content-center text-muted">Đang tải menu...</div>
  }

  if (fatalError) {
    return (
      <div className="cus-page d-flex flex-column align-items-center justify-content-center text-center p-4">
        <div style={{ fontSize: 40 }}>☕</div>
        <h5 className="fw-bold mt-2">Không mở được menu</h5>
        <p className="text-muted">{fatalError}</p>
      </div>
    )
  }

  return (
    <div className="cus-page">
      <header className="cus-header">
        <div className="cus-header-top">
          <div>
            <div className="cus-shop">Cafe Shop</div>
            <div className="cus-table">{table.tableNumber}</div>
          </div>
          <div className="d-flex gap-2">
            {/* 2 nút này thuộc màn khác (Call Waiter, Order Tracking UC-CU06) - để sẵn giao diện */}
            <button className="cus-action" disabled title="Chức năng đang phát triển">
              <span>🔔</span>Gọi nhân viên
            </button>
            <button className="cus-action" disabled title="Chức năng đang phát triển">
              <span>🧾</span>Đơn của bàn
            </button>
          </div>
        </div>
        <nav className="cus-tabs">
          {menu.map((c) => (
            <button key={c.id} className={`cus-tab ${c.id === activeCat ? 'active' : ''}`} onClick={() => scrollToCategory(c.id)}>
              {c.name}
            </button>
          ))}
        </nav>
      </header>

      {menu.length === 0 && <div className="text-center text-muted py-5">Menu đang được cập nhật</div>}

      {menu.map((c) => (
        <section key={c.id}>
          <div className="cus-section-title" ref={(el) => { sectionRefs.current[c.id] = el }}>{c.name}</div>
          {c.items.map((item) => {
            const disabled = !item.orderable
            return (
              <div key={item.id} className={`cus-item ${disabled ? 'disabled' : ''}`}>
                <div className="cus-item-info">
                  <div className="cus-item-name">{item.name}</div>
                  {item.description && <div className="cus-item-desc">{item.description}</div>}
                  <div className="cus-item-price">
                    {disabled ? <span className="badge-soft muted">Tạm hết</span> : formatVnd(item.basePrice)}
                  </div>
                </div>
                <div className="cus-item-img">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : initial(item.name)}
                  <button
                    className="cus-add" disabled={disabled} aria-label={`Thêm ${item.name}`}
                    onClick={() => setCustomizing({ item, line: null })}
                  >+</button>
                </div>
              </div>
            )
          })}
        </section>
      ))}

      {cartCount > 0 && (
        <button className="cus-cart-bar" onClick={() => { setSubmitError(''); setShowCart(true) }}>
          <span><span className="cus-cart-count">{cartCount}</span>Xem giỏ hàng</span>
          <span>{formatVnd(cartTotal)}</span>
        </button>
      )}

      <ItemCustomizeModal
        item={customizing?.item}
        editingLine={customizing?.line}
        onClose={() => setCustomizing(null)}
        onConfirm={handleConfirmItem}
      />

      <CartModal
        show={showCart}
        cart={cart}
        submitting={submitting}
        error={submitError}
        onClose={() => setShowCart(false)}
        onChangeQty={changeQty}
        onEdit={editLine}
        onSubmit={submitOrder}
      />

      <AppModal
        show={!!placedOrder}
        title="Đã gửi đơn 🎉"
        onClose={() => setPlacedOrder(null)}
        width={480}
        footer={<button className="btn btn-primary w-100" onClick={() => setPlacedOrder(null)}>Tiếp tục xem menu</button>}
      >
        {placedOrder && (
          <>
            <p className="mb-3">
              Mã đơn <b>{placedOrder.orderNumber}</b> · <b>{placedOrder.tableNumber}</b><br />
              <span className="text-muted small">Quán đã nhận đơn, nhân viên sẽ xác nhận và pha chế ngay.</span>
            </p>
            {placedOrder.items.map((i) => (
              <div key={i.id} className="d-flex justify-content-between py-2 border-bottom small">
                <div>
                  <div className="fw-semi">{i.quantity} × {i.menuItemName}</div>
                  <div className="text-muted">{describeLine(i)}</div>
                </div>
                <div>{formatVnd(i.subtotal)}</div>
              </div>
            ))}
            <div className="d-flex justify-content-between pt-3 fw-bold">
              <span>Tổng cộng</span><span>{formatVnd(placedOrder.totalAmount)}</span>
            </div>
          </>
        )}
      </AppModal>
    </div>
  )
}
