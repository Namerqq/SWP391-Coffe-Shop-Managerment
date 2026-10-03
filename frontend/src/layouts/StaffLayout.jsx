import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleNav } from '../routes/registry'
import { initials, roleLabel } from '../utils/format'
import '../styles/staff.css'

/** Khung chung cho màn hình nhân viên (Pha chế, Phục vụ, Thu ngân...). Menu trái lấy theo vai trò từ src/routes/*Nav.js. */
export default function StaffLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  const nav = roleNav[user.roleName] || { subtitle: roleLabel(user.roleName), items: [] }
  const home = nav.items[0]?.to || '/home'

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <Link to={home} className="brand">
          <span className="brand-logo"><i className="bi bi-cup-hot-fill" /></span>
          <span>
            <div className="brand-name">Cafe Shop</div>
            <div className="brand-sub">{nav.subtitle || roleLabel(user.roleName)}</div>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="Điều hướng">
          <div className="nav-label cf-section-title">Chức năng</div>
          {nav.items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <i className={`bi ${n.icon}`} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button className="btn btn-light-soft mt-auto w-100 d-flex align-items-center justify-content-center gap-2" onClick={logout}>
          <i className="bi bi-box-arrow-right" /> Đăng xuất
        </button>
      </aside>
      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="btn btn-light-soft btn-icon d-lg-none" onClick={() => setOpen(true)} aria-label="Mở menu">
            <i className="bi bi-list" />
          </button>
          <div className="d-none d-lg-block" />
          <div className="user-chip">
            <div className="d-none d-sm-block">
              <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{user.fullName}</div>
              <div className="cf-muted" style={{ fontSize: '0.78rem' }}>{roleLabel(user.roleName)}</div>
            </div>
            <span className="avatar">{initials(user.fullName)}</span>
          </div>
        </header>

        <main className="admin-content staff-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
