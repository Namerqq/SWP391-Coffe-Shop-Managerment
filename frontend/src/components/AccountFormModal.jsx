import { useEffect, useState } from 'react'
import Modal from './Modal'
import adminApi from '../api/adminApi'
import { errorMessage } from '../api/axiosClient'
import { roleLabel } from '../utils/format'

const EMPTY = { fullName: '', username: '', email: '', password: '', roleId: '' }

/**
 * Thêm tài khoản (account = null) hoặc Cập nhật thông tin tài khoản (UC-AD03).
 * Vai trò chỉ chọn khi thêm mới; đổi vai trò dùng chức năng "Gán vai trò" (UC-AD04).
 */
export default function AccountFormModal({ show, account, roles, onClose, onSaved }) {
  const isEdit = !!account
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (!show) return
    setForm(account
      ? { fullName: account.fullName, username: account.username, email: account.email, password: '', roleId: account.roleId }
      : { ...EMPTY, roleId: roles.find((r) => r.name !== 'ADMIN')?.id || '' })
    setErrors({})
    setError('')
    setShowPw(false)
  }, [show, account, roles])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên'
    if (!/^[a-zA-Z0-9._]{3,50}$/.test(form.username.trim())) e.username = '3-50 ký tự, chỉ gồm chữ, số, dấu . và _'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = 'Email không hợp lệ'
    if (!isEdit && !form.password) e.password = 'Vui lòng nhập mật khẩu'
    if (!isEdit && !form.roleId) e.roleId = 'Vui lòng chọn vai trò'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    setError('')
    try {
      const res = isEdit
        ? await adminApi.updateUser(account.id, {
            fullName: form.fullName, username: form.username, email: form.email, newPassword: form.password,
          })
        : await adminApi.createUser({ ...form, roleId: Number(form.roleId) })
      onSaved(res.data)
    } catch (e) {
      const data = e.response?.data
      if (data && typeof data === 'object') {
        const { message, ...fieldErrors } = data
        setErrors(fieldErrors)
      }
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const field = (name, label, props = {}) => (
    <div className="mb-3">
      <label className="form-label" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
             value={form[name]} onChange={set(name)} {...props} />
      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
    </div>
  )

  return (
    <Modal
      show={show}
      title={isEdit ? 'Cập nhật tài khoản' : 'Thêm tài khoản'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" form="account-form" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {field('fullName', 'Họ và tên', { placeholder: 'VD: Nguyễn Văn An', autoFocus: true })}
        <div className="row g-3">
          <div className="col-sm-6">{field('username', 'Tên đăng nhập', { placeholder: 'VD: an.nguyen', autoComplete: 'off' })}</div>
          <div className="col-sm-6">{field('email', 'Email', { type: 'email', placeholder: 'an@cafeshop.vn' })}</div>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="f-password">{isEdit ? 'Đặt lại mật khẩu' : 'Mật khẩu'}</label>
          <div className="input-group">
            <input id="f-password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                   className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                   placeholder={isEdit ? 'Để trống nếu giữ mật khẩu cũ' : 'Tối thiểu 6 ký tự'}
                   value={form.password} onChange={set('password')} />
            <button type="button" className="btn btn-light-soft" onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
              <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
            </button>
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
        </div>

        {!isEdit && (
          <div className="mb-1">
            <label className="form-label" htmlFor="f-role">Vai trò</label>
            <select id="f-role" className={`form-select ${errors.roleId ? 'is-invalid' : ''}`} value={form.roleId} onChange={set('roleId')}>
              <option value="">— Chọn vai trò —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
            </select>
            {errors.roleId && <div className="invalid-feedback">{errors.roleId}</div>}
          </div>
        )}
      </form>
    </Modal>
  )
}
