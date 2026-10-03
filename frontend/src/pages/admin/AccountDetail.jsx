import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import adminApi from '../../api/adminApi'
import { errorMessage } from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AccountFormModal from '../../components/AccountFormModal'
import useAccountActions from '../../components/useAccountActions'
import { RoleBadge, StatusBadge } from '../../components/Badges'
import { formatDateTime, initials, ROLE_DESCRIPTIONS, roleLabel } from '../../utils/format'

// UC-AD02 View Account Detail · UC-AD03 Update · UC-AD04 Assign Role · UC-AD05 Deactivate
export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me, refreshUser } = useAuth()
  const toast = useToast()

  const [account, setAccount] = useState(null)
  const [roles, setRoles] = useState([])
  const [roleId, setRoleId] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setError('')
    adminApi.getUser(id)
      .then((res) => { setAccount(res.data); setRoleId(String(res.data.roleId)) })
      .catch((e) => setError(errorMessage(e, 'Không tải được tài khoản.')))
    adminApi.getRoles().then((res) => setRoles(res.data)).catch(() => {})
  }, [id])

  const actions = useAccountActions({
    onStatusChanged: setAccount,
    onDeleted: () => navigate('/admin/accounts', { replace: true }),
  })

  if (error) {
    return (
      <div className="cf-card empty-state">
        <i className="bi bi-person-x" />
        <p>{error}</p>
        <Link to="/admin/accounts" className="btn btn-light-soft">Quay lại danh sách</Link>
      </div>
    )
  }
  if (!account) return <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>

  const isMe = account.id === me.id
  const roleChanged = roleId !== String(account.roleId)

  const saveRole = async () => {
    setSavingRole(true)
    try {
      const res = await adminApi.assignRole(account.id, Number(roleId))
      setAccount(res.data)
      toast(`Đã đổi vai trò thành ${roleLabel(res.data.roleName)}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      setRoleId(String(account.roleId))
    } finally {
      setSavingRole(false)
    }
  }

  const handleSaved = (saved) => {
    setAccount(saved)
    if (saved.id === me.id) refreshUser(saved)
    setEditing(false)
    toast('Đã cập nhật thông tin tài khoản')
  }

  const selectedRole = roles.find((r) => String(r.id) === roleId)

  return (
    <>
      <Link to="/admin/accounts" className="btn btn-link text-decoration-none px-0 mb-3 cf-muted">
        <i className="bi bi-arrow-left me-1" /> Danh sách tài khoản
      </Link>

      <div className="cf-card p-4 mb-4">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <span className="avatar avatar-lg">{initials(account.fullName)}</span>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <h1 className="page-title text-truncate">{account.fullName}</h1>
            <div className="d-flex flex-wrap gap-2 mt-2">
              <RoleBadge role={account.roleName} />
              <StatusBadge status={account.status} />
              {isMe && <span className="cf-badge badge-inactive">Tài khoản của bạn</span>}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <i className="bi bi-pencil me-1" /> Sửa thông tin
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="cf-card p-4 h-100">
            <div className="cf-section-title mb-2">Thông tin tài khoản</div>
            <dl className="mb-0">
              <div className="info-row"><dt>Mã tài khoản</dt><dd>#{account.id}</dd></div>
              <div className="info-row"><dt>Họ và tên</dt><dd>{account.fullName}</dd></div>
              <div className="info-row"><dt>Tên đăng nhập</dt><dd>{account.username}</dd></div>
              <div className="info-row"><dt>Email</dt><dd>{account.email}</dd></div>
              <div className="info-row"><dt>Vai trò</dt><dd>{roleLabel(account.roleName)}</dd></div>
              <div className="info-row"><dt>Trạng thái</dt><dd><StatusBadge status={account.status} /></dd></div>
              <div className="info-row"><dt>Ngày tạo</dt><dd>{formatDateTime(account.createdAt)}</dd></div>
              <div className="info-row"><dt>Cập nhật lần cuối</dt><dd>{formatDateTime(account.updatedAt)}</dd></div>
            </dl>
          </div>
        </div>

        <div className="col-lg-5 d-flex flex-column gap-4">
          {/* UC-AD04 Assign Role to User */}
          <div className="cf-card p-4">
            <div className="cf-section-title mb-3">Gán vai trò</div>
            <select className="form-select mb-2" value={roleId} disabled={isMe || savingRole}
                    onChange={(e) => setRoleId(e.target.value)} aria-label="Vai trò">
              {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
            </select>
            {selectedRole && <div className="form-text mb-3">{ROLE_DESCRIPTIONS[selectedRole.name] || selectedRole.description}</div>}
            {isMe ? (
              <div className="form-text">Bạn không thể tự đổi vai trò của chính mình.</div>
            ) : (
              <div className="d-flex gap-2">
                <button className="btn btn-primary" disabled={!roleChanged || savingRole} onClick={saveRole}>
                  {savingRole && <span className="spinner-border spinner-border-sm me-2" />}
                  Lưu vai trò
                </button>
                {roleChanged && (
                  <button className="btn btn-light-soft" onClick={() => setRoleId(String(account.roleId))}>Hủy</button>
                )}
              </div>
            )}
            {roleChanged && !isMe && (
              <div className="form-text mt-2"><i className="bi bi-info-circle me-1" />Người dùng sẽ bị đăng xuất để áp dụng quyền mới.</div>
            )}
          </div>

          {/* UC-AD05 Deactivate Account */}
          <div className="cf-card p-4">
            <div className="cf-section-title mb-2">Trạng thái đăng nhập</div>
            <p className="cf-muted small mb-3">
              {account.status === 'ACTIVE' && 'Tài khoản đang hoạt động và có thể đăng nhập.'}
              {account.status === 'INACTIVE' && 'Tài khoản đã bị vô hiệu hóa, không thể đăng nhập.'}
              {account.status === 'LOCKED' && 'Tài khoản bị khóa do nhập sai mật khẩu quá số lần cho phép.'}
            </p>
            {account.status === 'ACTIVE' ? (
              <button className="btn btn-outline-danger" disabled={isMe} onClick={() => actions.askToggleStatus(account)}>
                <i className="bi bi-slash-circle me-1" /> Vô hiệu hóa tài khoản
              </button>
            ) : (
              <button className="btn btn-outline-primary" onClick={() => actions.askToggleStatus(account)}>
                <i className={`bi ${account.status === 'LOCKED' ? 'bi-unlock' : 'bi-check-circle'} me-1`} />
                {account.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Kích hoạt lại'}
              </button>
            )}
          </div>

          <div className="cf-card p-4">
            <div className="cf-section-title mb-2" style={{ color: 'var(--cf-danger)' }}>Xóa tài khoản</div>
            <p className="cf-muted small mb-3">Chỉ xóa được tài khoản chưa phát sinh đơn hàng, thanh toán hay phiếu kho.</p>
            <button className="btn btn-outline-danger" disabled={isMe} onClick={() => actions.askDelete(account)}>
              <i className="bi bi-trash me-1" /> Xóa tài khoản
            </button>
          </div>
        </div>
      </div>

      <AccountFormModal show={editing} account={account} roles={roles} onClose={() => setEditing(false)} onSaved={handleSaved} />
      {actions.modal}
    </>
  )
}
