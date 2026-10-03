import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import adminApi from '../../api/adminApi'
import { errorMessage } from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge } from '../../components/Badges'
import { formatDateTime, initials, ROLE_LABELS, roleLabel } from '../../utils/format'

// Trang chủ Admin: số liệu nhanh về tài khoản.
export default function AdminOverview() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getUsers()
      .then((res) => setAccounts(res.data))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  const count = (fn) => (accounts || []).filter(fn).length
  const stats = [
    { label: 'Tổng tài khoản', value: accounts?.length ?? '—', icon: 'bi-people' },
    { label: 'Đang hoạt động', value: accounts ? count((a) => a.status === 'ACTIVE') : '—', icon: 'bi-person-check' },
    { label: 'Đã vô hiệu hóa', value: accounts ? count((a) => a.status === 'INACTIVE') : '—', icon: 'bi-person-dash' },
    { label: 'Bị khóa', value: accounts ? count((a) => a.status === 'LOCKED') : '—', icon: 'bi-lock' },
  ]
  const total = accounts?.length || 0

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title">Xin chào, {user.fullName}</h1>
        <p className="page-subtitle">Tổng quan tài khoản nhân viên và truy cập hệ thống.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div className="col-6 col-xl-3" key={s.label}>
            <div className="cf-card stat-card h-100">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="cf-muted small mb-2">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
                <span className="stat-icon"><i className={`bi ${s.icon}`} /></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="cf-card p-4 h-100">
            <div className="cf-section-title mb-3">Theo vai trò</div>
            {Object.keys(ROLE_LABELS).map((role) => {
              const n = count((a) => a.roleName === role)
              return (
                <div key={role} className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{roleLabel(role)}</span>
                    <span className="fw-semibold">{accounts ? n : '—'}</span>
                  </div>
                  <div className="progress" style={{ height: 6, background: 'var(--cf-bg)' }}>
                    <div className="progress-bar" style={{ width: total ? `${(n / total) * 100}%` : 0, background: 'var(--cf-primary)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="col-lg-7">
          <div className="cf-card h-100">
            <div className="d-flex justify-content-between align-items-center p-4 pb-2">
              <div className="cf-section-title">Tài khoản mới tạo</div>
              <Link to="/admin/accounts" className="small text-decoration-none">Xem tất cả <i className="bi bi-arrow-right" /></Link>
            </div>
            <div className="px-4 pb-3">
              {(accounts || []).slice(0, 5).map((a) => (
                <Link key={a.id} to={`/admin/accounts/${a.id}`} className="d-flex align-items-center gap-3 py-2 text-decoration-none" style={{ color: 'inherit' }}>
                  <span className="avatar">{initials(a.fullName)}</span>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-semibold text-truncate">{a.fullName}</div>
                    <div className="cell-sub">{roleLabel(a.roleName)} · {formatDateTime(a.createdAt)}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))}
              {accounts && accounts.length === 0 && <div className="empty-state">Chưa có tài khoản nào.</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
