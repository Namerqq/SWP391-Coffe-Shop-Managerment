import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'

/**
 * Thêm khách thân thiết (UC-C13) hoặc sửa tên / SĐT (UC-C12) — màn Khách thân thiết.
 * customer = null -> thêm mới (POST /cashier/customers), có customer -> sửa (PUT /cashier/loyalty-customers/{id}).
 * Đổi SĐT không đổi điểm và lịch sử điểm (gắn theo khách, không theo số).
 */
export default function CustomerFormModal({ show, customer, prefillPhone, onClose, onSaved }) {
  const editing = !!customer
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!show) return
    setPhone(customer?.phoneNumber || prefillPhone || '')
    setName(customer?.fullName || '')
    setError('')
  }, [show, customer, prefillPhone])

  const phoneChanged = editing && phone.replace(/[\s.-]/g, '') !== customer.phoneNumber

  const submit = async (e) => {
    e?.preventDefault()
    if (!phone.trim()) {
      setError('Nhập số điện thoại của khách.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = { phoneNumber: phone.trim(), fullName: name.trim() || null }
      const res = editing
        ? await cashierApi.updateCustomer(customer.id, data)
        : await cashierApi.createCustomer(data)
      onSaved(res.data)
    } catch (err) {
      setError(errorMessage(err, editing ? 'Không lưu được thông tin khách.' : 'Không đăng ký được khách.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      show={show}
      title={editing ? 'Sửa thông tin khách' : 'Thêm khách thân thiết'}
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            {editing ? 'Lưu' : 'Đăng ký'}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="cust-phone">Số điện thoại <span className="text-danger">*</span></label>
          <input id="cust-phone" className="form-control" inputMode="tel" autoComplete="off" autoFocus
                 placeholder="VD: 0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="form-text">10-11 chữ số, bắt đầu bằng 0. Mỗi số chỉ thuộc 1 khách.</div>
        </div>
        <div className="mb-1">
          <label className="form-label" htmlFor="cust-name">Tên khách</label>
          <input id="cust-name" className="form-control" maxLength={100} autoComplete="off"
                 placeholder="Không bắt buộc" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {editing && (
          <div className="cell-sub mt-3">
            Điểm hiện có: <strong>{customer.currentPoints}</strong>. Thu ngân không cộng / trừ điểm tay, điểm chỉ đổi khi thanh toán.
          </div>
        )}
        {phoneChanged && (
          <div className="alert alert-warning small mt-3 mb-0">
            Đổi số điện thoại: điểm và lịch sử điểm chuyển theo số mới. Lần sau khách phải đọc số mới để tích / dùng điểm.
          </div>
        )}
        {error && <div className="alert alert-danger small mt-3 mb-0">{error}</div>}
      </form>
    </Modal>
  )
}
