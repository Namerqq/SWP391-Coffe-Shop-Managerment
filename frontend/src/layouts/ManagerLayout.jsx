import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { initials, roleLabel } from '../utils/format'
import '../styles/manager.css'

const NAV = [
  { to: '/manager', label: 'Tổng quan', icon: 'bi-grid', end: true },
  { to: '/manager/inventory', label: 'Kho nguyên liệu', icon: 'bi-box-seam' },
]

/** Khung chung cho màn hình Quản lý (Manager). Menu trái theo thiết kế reference. */
export default function ManagerLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <Link to="/manager" className="brand">
          <span className="brand-logo"><i className="bi bi-cup-hot-fill" /></span>
          <span>
            <div className="brand-name">Cafe Shop</div>
            <div className="brand-sub">Quản lý</div>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="Điều hướng quản lý">
          <div className="nav-label cf-section-title">Quản lý</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <i className={`bi ${n.icon}`} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom-actions">
          <button className="sidebar-action-btn" onClick={logout}>
            <i className="bi bi-box-arrow-right" /> Đăng xuất
          </button>
        </div>
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

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
