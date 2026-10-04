import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../utils/format'

// Trang tạm cho các vai trò chưa có giao diện riêng (Manager, Cashier, Waiter, Barista).
export default function StaffHome() {
  const { user, logout } = useAuth()
  return (
    <main className="login-page">
      <div className="login-card text-center">
        <span className="brand-logo mb-3" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>
          <i className="bi bi-cup-hot-fill" />
        </span>
        <h1 className="login-title">Xin chào, {user.fullName}</h1>
        <p className="cf-muted mt-2">
          Bạn đang đăng nhập với vai trò <strong>{roleLabel(user.roleName)}</strong>.<br />
          Màn hình dành cho vai trò này đang được phát triển.
        </p>
        <button className="btn btn-light-soft mt-2" onClick={logout}>
          <i className="bi bi-box-arrow-right me-2" />Đăng xuất
        </button>
      </div>
    </main>
  )
}
