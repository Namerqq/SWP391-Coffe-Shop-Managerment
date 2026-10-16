import { createContext, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import GuestItemModal from '../pages/guest/GuestItemModal'
import { unitTotal } from '../utils/orderOptions'
import '../styles/guest.css'

// Bộ nhớ chung (Context) cho giỏ hàng online
const OnlineContext = createContext(null)
export const useOnline = () => useContext(OnlineContext)

// Tùy chọn size & topping mẫu khi chưa nối database
const SAMPLE_OPTIONS = {
  sizes: [
    { id: 1, name: 'Size S', price: 0 },
    { id: 2, name: 'Size M', price: 6000 },
    { id: 3, name: 'Size L', price: 10000 },
  ],
  toppings: [
    { id: 10, name: 'Thêm Espresso', price: 10000 },
    { id: 11, name: 'Kem Cheese', price: 8000 },
    { id: 12, name: 'Trân châu trắng', price: 6000 },
  ],
}

export default function OnlineLayout() {
  // Đọc giỏ hàng từ LocalStorage khi mở trang
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('online_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Món đang mở modal (null = đóng modal)
  const [pickingItem, setPickingItem] = useState(null)

  // Tự động lưu giỏ hàng vào LocalStorage mỗi khi giỏ đổi
  useEffect(() => {
    localStorage.setItem('online_cart', JSON.stringify(cart))
  }, [cart])

  // Thêm món vào giỏ
  const addToCart = (line) => {
    const key = `item_${Date.now()}`
    setCart((prev) => [...prev, { ...line, key }])
    setPickingItem(null)
  }

  // Đổi số lượng món trong giỏ
  const updateQuantity = (key, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          const qty = item.quantity + delta
          return qty > 0 ? { ...item, quantity: qty } : item
        }
        return item
      })
    )
  }

  // Xóa 1 món khỏi giỏ
  const removeItem = (key) => {
    setCart((prev) => prev.filter((item) => item.key !== key))
  }

  // Xóa sạch giỏ
  const clearCart = () => {
    setCart([])
    localStorage.removeItem('online_cart')
  }

  // Tính tổng số lượng và tổng tiền
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + unitTotal(item) * item.quantity, 0)

  return (
    <OnlineContext.Provider
      value={{
        cart,
        totalCount,
        totalPrice,
        openModal: (item) => setPickingItem(item),
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      <div className="gx-shell">
        {/* Header */}
        <header className="gx-header">
          <div className="gx-header-inner justify-content-center" style={{ justifyContent: 'center' }}>
            <Link to="/" className="gx-brand" title="Về trang chủ">
              <span className="gc-logo-text sm">
                <span className="gc-brick-mark" aria-hidden="true"><i /><i /><i /></span>
                <span className="gc-logo-words">
                  <b>Gạch</b> <small>Coffee</small>
                </span>
              </span>
            </Link>
          </div>

          <nav className="gx-tabs">
            <NavLink to="/online-order" end>
              <i className="bi bi-cup-hot" />
              <span>Thực đơn</span>
            </NavLink>

            <NavLink to="/online-order/cart">
              <i className="bi bi-bag" />
              <span>Giỏ hàng</span>
              {totalCount > 0 && <b className="gx-badge">{totalCount}</b>}
            </NavLink>

            <NavLink to="/online-order/orders">
              <i className="bi bi-receipt" />
              <span>Đơn của tôi</span>
            </NavLink>
          </nav>
        </header>

        {/* Nội dung trang con */}
        <main className="gx-main">
          <Outlet />
        </main>
      </div>

      {/* Modal tùy chỉnh món (Size / Đá / Đường / Topping) */}
      <GuestItemModal
        show={Boolean(pickingItem)}
        item={pickingItem}
        options={SAMPLE_OPTIONS}
        confirmText="Thêm vào giỏ"
        onClose={() => setPickingItem(null)}
        onConfirm={addToCart}
      />
    </OnlineContext.Provider>
  )
}
