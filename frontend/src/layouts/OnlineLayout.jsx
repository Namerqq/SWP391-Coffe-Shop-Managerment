import { createContext, useContext, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { unitTotal } from '../utils/orderOptions'
import '../styles/guest.css'

// Bộ nhớ chung (Context) cho giỏ hàng online
const OnlineContext = createContext(null)
export const useOnline = () => useContext(OnlineContext)

export default function OnlineLayout() {
  // Danh sách món trong giỏ
  const [cart, setCart] = useState([])

  // Thêm món vào giỏ
  const addToCart = (line) => {
    const key = `item_${Date.now()}`
    setCart((prev) => [...prev, { ...line, key }])
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
  }

  // Tính tổng số lượng và tổng tiền
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + unitTotal(item) * item.quantity, 0)

  return (
    <OnlineContext.Provider
      value={{ cart, totalCount, totalPrice, addToCart, updateQuantity, removeItem, clearCart }}
    >
      <div className="gx-shell">
        {/* Header */}
        <header className="gx-header">
          <div className="gx-header-inner justify-content-center" style={{ justifyContent: 'center' }}>
            {/* Logo giữa, bấm về trang chủ */}
            <Link to="/" className="gx-brand" title="Về trang chủ">
              <span className="gc-logo-text sm">
                <span className="gc-brick-mark" aria-hidden="true"><i /><i /><i /></span>
                <span className="gc-logo-words">
                  <b>Gạch</b> <small>Coffee</small>
                </span>
              </span>
            </Link>
          </div>

          {/* 3 tab chuyển trang */}
          <nav className="gx-tabs">
            <NavLink to="/online-order" end>
              <i className="bi bi-cup-hot" />
              <span>Thực đơn</span>
            </NavLink>

            <NavLink to="/online-order/cart">
              <i className="bi bi-bag" />
              <span>Giỏ hàng</span>
              <b className="gx-badge">2</b>
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
    </OnlineContext.Provider>
  )
}
