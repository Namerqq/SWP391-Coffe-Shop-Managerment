import { Link, NavLink, Outlet } from 'react-router-dom'
import '../styles/guest.css'

export default function OnlineLayout() {
  return (
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
  )
}
