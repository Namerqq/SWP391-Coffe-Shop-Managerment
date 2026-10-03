import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/axiosClient'
import { homeOf } from '../routes/registry'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)

  if (user) return <Navigate to={homeOf(user)} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const u = await login(identifier.trim(), password, remember)
      const from = location.state?.from
      navigate(from && from.startsWith(homeOf(u)) ? from : homeOf(u), { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Đăng nhập thất bại.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="d-flex flex-column align-items-center text-center mb-4">
          <span className="brand-logo mb-3" style={{ width: 52, height: 52, fontSize: '1.5rem' }}>
            <i className="bi bi-cup-hot-fill" />
          </span>
          <h1 className="login-title">Đăng nhập</h1>
          <p className="cf-muted small mt-2 mb-0">Vui lòng nhập tài khoản và mật khẩu để tiếp tục</p>
        </div>

        {location.state?.expired && !error && (
          <div className="alert alert-warning py-2 small">Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.</div>
        )}
        {error && (
          <div className="alert alert-danger py-2 small d-flex gap-2 align-items-start" role="alert">
            <i className="bi bi-exclamation-circle mt-1" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="identifier">Tên đăng nhập hoặc email</label>
            <div className="input-icon">
              <i className="bi bi-person" />
              <input id="identifier" className="form-control" placeholder="VD: admin hoặc an@cafeshop.vn"
                     autoComplete="username" autoFocus value={identifier}
                     onChange={(e) => setIdentifier(e.target.value)} />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="password">Mật khẩu</label>
            <div className="input-icon">
              <i className="bi bi-lock" />
              <input id="password" type={showPw ? 'text' : 'password'} className="form-control" placeholder="••••••"
                     autoComplete="current-password" value={password}
                     onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: '2.5rem' }} />
              <button type="button" className="toggle-pw" onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="form-check mb-0">
              <input className="form-check-input" type="checkbox" id="remember" checked={remember}
                     onChange={(e) => setRemember(e.target.checked)} />
              <label className="form-check-label small" htmlFor="remember">Ghi nhớ đăng nhập</label>
            </div>
            <button type="button" className="btn btn-link p-0 small text-decoration-none" style={{ fontSize: '0.875rem' }}
                    onClick={() => setShowForgot((s) => !s)}>
              Quên mật khẩu?
            </button>
          </div>

          {showForgot && (
            <div className="alert py-2 small mb-3" style={{ background: 'var(--cf-primary-soft)', color: 'var(--cf-primary-hover)', border: 0 }}>
              <i className="bi bi-info-circle me-1" /> Vui lòng liên hệ Quản trị viên để được cấp lại mật khẩu.
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
            {loading && <span className="spinner-border spinner-border-sm me-2" />}
            Đăng nhập
          </button>
        </form>

        <p className="text-center cf-muted small mt-4 mb-0">© Cafe Shop · Hệ thống quản lý quán cà phê</p>
      </div>
    </main>
  )
}
