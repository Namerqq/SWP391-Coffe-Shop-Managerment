import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import adminApi from '../../api/adminApi'
import { errorMessage } from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AccountFormModal from '../../components/AccountFormModal'
import useAccountActions from '../../components/useAccountActions'
import { RoleBadge, StatusBadge } from '../../components/Badges'
import { formatDateTime, initials, roleLabel, STATUS_LABELS } from '../../utils/format'

// UC-AD01 View Account List (+ thêm / sửa / vô hiệu hóa / xóa ngay trên danh sách)
export default function AccountList() {
  const { user: me, refreshUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [keyword, setKeyword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ show: false, account: null })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getUsers({ keyword: keyword || undefined, roleId: roleId || undefined, status: status || undefined })
      setAccounts(res.data)
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách tài khoản.'))
    } finally {
      setLoading(false)
    }
  }, [keyword, roleId, status])

  // Gõ tìm kiếm -> đợi 300ms rồi mới gọi API.
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    adminApi.getRoles().then((res) => setRoles(res.data)).catch(() => {})
  }, [])

  const actions = useAccountActions({ onStatusChanged: load, onDeleted: load })

  const handleSaved = (saved) => {
    toast(form.account ? 'Đã cập nhật tài khoản' : `Đã tạo tài khoản ${saved.username}`)
    if (saved.id === me.id) refreshUser(saved)
    setForm({ show: false, account: null })
    load()
  }

  const hasFilter = keyword || roleId || status

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Tài khoản nhân viên</h1>
          <p className="page-subtitle">Quản lý tài khoản, vai trò và trạng thái đăng nhập. Tài khoản đã vô hiệu hóa không thể đăng nhập nhưng vẫn giữ lịch sử.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({ show: true, account: null })}>
          <i className="bi bi-plus-lg me-1" /> Thêm tài khoản
        </button>
      </div>

      <div className="cf-card">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom" style={{ borderColor: 'var(--cf-border)' }}>
          <div className="input-icon flex-grow-1" style={{ minWidth: 220 }}>
            <i className="bi bi-search" />
            <input className="form-control" placeholder="Tìm theo tên, tên đăng nhập, email..." value={keyword}
                   onChange={(e) => setKeyword(e.target.value)} aria-label="Tìm tài khoản" />
          </div>
          <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={roleId}
                  onChange={(e) => setRoleId(e.target.value)} aria-label="Lọc theo vai trò">
            <option value="">Mọi vai trò</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={status}
                  onChange={(e) => setStatus(e.target.value)} aria-label="Lọc theo trạng thái">
            <option value="">Mọi trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {hasFilter && (
            <button className="btn btn-link text-decoration-none" onClick={() => { setKeyword(''); setRoleId(''); setStatus('') }}>
              Xóa lọc
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger m-3">{error}</div>}

        <div className="table-responsive">
          <table className="table cf-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Tên đăng nhập</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th className="d-none d-xxl-table-cell">Ngày tạo</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const isMe = a.id === me.id
                return (
                  <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/accounts/${a.id}`)}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <span className="avatar">{initials(a.fullName)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold text-truncate">
                            {a.fullName} {isMe && <span className="cell-sub fw-normal">(bạn)</span>}
                          </div>
                          <div className="cell-sub text-truncate">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{a.username}</td>
                    <td><RoleBadge role={a.roleName} /></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="cell-sub text-nowrap d-none d-xxl-table-cell">{formatDateTime(a.createdAt)}</td>
                    <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/admin/accounts/${a.id}`} className="btn btn-light-soft btn-icon me-1" title="Xem chi tiết" aria-label="Xem chi tiết">
                        <i className="bi bi-eye" />
                      </Link>
                      <button className="btn btn-light-soft btn-icon me-1" title="Sửa" aria-label="Sửa"
                              onClick={() => setForm({ show: true, account: a })}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-light-soft btn-icon me-1" disabled={isMe}
                              title={a.status === 'ACTIVE' ? 'Vô hiệu hóa' : a.status === 'LOCKED' ? 'Mở khóa' : 'Kích hoạt'}
                              aria-label={a.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                              onClick={() => actions.askToggleStatus(a)}>
                        <i className={`bi ${a.status === 'ACTIVE' ? 'bi-slash-circle' : a.status === 'LOCKED' ? 'bi-unlock' : 'bi-check-circle'}`} />
                      </button>
                      <button className="btn btn-outline-danger btn-icon" disabled={isMe} title="Xóa" aria-label="Xóa"
                              onClick={() => actions.askDelete(a)}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && accounts.length === 0 && (
          <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>
        )}
        {!loading && !error && accounts.length === 0 && (
          <div className="empty-state">
            <i className="bi bi-people" />
            {hasFilter ? 'Không có tài khoản nào khớp bộ lọc.' : 'Chưa có tài khoản nào.'}
          </div>
        )}
        {accounts.length > 0 && (
          <div className="px-3 py-2 cell-sub border-top" style={{ borderColor: 'var(--cf-border)' }}>
            {accounts.length} tài khoản
          </div>
        )}
      </div>

      <AccountFormModal show={form.show} account={form.account} roles={roles}
                        onClose={() => setForm({ show: false, account: null })} onSaved={handleSaved} />
      {actions.modal}
    </>
  )
}
