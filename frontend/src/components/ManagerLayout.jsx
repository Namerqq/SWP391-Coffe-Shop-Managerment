import { NavLink, Outlet } from 'react-router-dom'

// Khung chung cho các màn của Manager: sidebar trái + topbar + nội dung (Outlet).
// Các mục chưa làm để dạng <span> (mờ), khi nhóm làm xong thì đổi sang NavLink.
export default function ManagerLayout() {
  return (
    <div className="mgr-shell">
      <aside className="mgr-sidebar">
        <div className="mgr-brand">
          <div className="mgr-brand-logo">☕</div>
          <div>
            <div className="mgr-brand-name">Cafe Shop</div>
            <div className="mgr-brand-role">Quản lý</div>
          </div>
        </div>

        <nav className="mgr-nav">
          <span>Tổng quan</span>
          <span>Bàn &amp; mã QR</span>
          <div className="mgr-nav-section">Menu</div>
          <NavLink to="/manager/menu-items">Món</NavLink>
          <NavLink to="/manager/categories">Danh mục</NavLink>
          <div className="mgr-nav-section">Kho &amp; báo cáo</div>
          <span>Kho nguyên liệu</span>
          <span>Báo cáo</span>
        </nav>
      </aside>

      <main className="mgr-main">
        <header className="mgr-topbar">
          <div className="text-end">
            <div className="fw-semi" style={{ fontSize: '.9rem' }}>Quản lý</div>
            <div className="text-muted" style={{ fontSize: '.75rem' }}>Manager</div>
          </div>
        </header>
        <div className="mgr-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
