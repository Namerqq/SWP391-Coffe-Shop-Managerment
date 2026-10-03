import { useState } from 'react'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { initials } from '../../utils/format'

/** Customer Lookup / Create Customer — UC-C10, UC-C13 (nằm trong hộp thanh toán). */
export default function CustomerPicker({ customer, onChange }) {
  const [phone, setPhone] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (customer) {
    return (
      <div className="cust-chip">
        <span className="avatar">{initials(customer.fullName || 'Khách')}</span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="fw-semibold text-truncate">{customer.fullName || 'Khách thân thiết'}</div>
          <div className="cell-sub">{customer.phoneNumber}, đang có {customer.currentPoints} điểm</div>
        </div>
        <button type="button" className="btn btn-light-soft btn-sm" onClick={() => { onChange(null); setPhone(''); setNotFound(false) }}>
          Bỏ chọn
        </button>
      </div>
    )
  }

  const search = async () => {
    if (!phone.trim()) {
      setError('Nhập số điện thoại của khách.')
      return
    }
    setBusy(true)
    setError('')
    setNotFound(false)
    try {
      const res = await cashierApi.findCustomer(phone.trim())
      onChange(res.data)
    } catch (e) {
      if (e.response?.status === 404) setNotFound(true)
      else setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await cashierApi.createCustomer({ phoneNumber: phone.trim(), fullName: name.trim() || null })
      setNotFound(false)
      setName('')
      onChange(res.data)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="input-group">
        <input className="form-control" inputMode="tel" placeholder="Số điện thoại khách" value={phone} aria-label="Số điện thoại khách"
               onChange={(e) => { setPhone(e.target.value); setNotFound(false) }}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search() } }} />
        <button type="button" className="btn btn-light-soft" disabled={busy} onClick={search}>
          {busy && !notFound ? <span className="spinner-border spinner-border-sm" /> : 'Tìm'}
        </button>
      </div>
      <div className="form-text">Không bắt buộc. Nhập để tích điểm hoặc dùng điểm.</div>
      {notFound && (
        <div className="cust-new">
          <div className="small mb-2">Chưa có khách với số này. Đăng ký khách thân thiết mới?</div>
          <input className="form-control form-control-sm mb-2" placeholder="Tên khách (không bắt buộc)" maxLength={100}
                 value={name} onChange={(e) => setName(e.target.value)} aria-label="Tên khách" />
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={busy} onClick={create}>Đăng ký khách mới</button>
        </div>
      )}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  )
}
