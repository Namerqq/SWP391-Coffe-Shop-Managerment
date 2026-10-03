import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'
import { initials } from '../../utils/format'

/** Customer Lookup / Create Customer — UC-C10, UC-C13 (nằm trong hộp thanh toán). */
function CustomerPicker({ customer, onChange }) {
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

/**
 * Payment Confirmation — UC-C05, C07 (chọn cách trả), C08 (xác nhận), C11 (dùng điểm), C14 (cộng điểm).
 * onSubmit({ method, customerId, pointsToRedeem }) phải trả về Promise của axios ({ data: PaymentResult }).
 */
export default function PaymentModal({ show, title, subtotal, initialCustomer, transferNote, onClose, onSubmit, onPaid }) {
  const [cfg, setCfg] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [points, setPoints] = useState('')
  const [method, setMethod] = useState('CASH')
  const [cash, setCash] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!show) return
    setCustomer(initialCustomer || null)
    setPoints('')
    setMethod('CASH')
    setCash('')
    setError('')
    cashierApi.getPaymentSettings()
      .then((res) => setCfg(res.data))
      .catch(() => setCfg({ pointValueVnd: 1000, vndPerPoint: 10000 }))
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null

  const pointValue = cfg?.pointValueVnd || 1000
  const maxPoints = customer ? Math.max(0, Math.min(customer.currentPoints, Math.floor(subtotal / pointValue))) : 0
  const wanted = parseInt(points, 10) || 0
  const usePoints = Math.min(Math.max(0, wanted), maxPoints)
  const discount = usePoints * pointValue
  const amount = subtotal - discount
  const earn = customer ? Math.floor(amount / (cfg?.vndPerPoint || 10000)) : 0
  const cashNum = parseInt(cash, 10) || 0
  const cashShort = method === 'CASH' && cash !== '' && cashNum < amount
  const bankReady = !!(cfg?.bankBin && cfg?.bankAccountNumber)
  const qrUrl = bankReady
    ? `https://img.vietqr.io/image/${encodeURIComponent(cfg.bankBin)}-${encodeURIComponent(cfg.bankAccountNumber)}-compact2.png`
      + `?amount=${amount}&addInfo=${encodeURIComponent(transferNote || 'Thanh toan')}`
      + `&accountName=${encodeURIComponent(cfg.bankAccountHolder || '')}`
    : ''
  const quick = [...new Set([amount, Math.ceil(amount / 10000) * 10000, Math.ceil(amount / 50000) * 50000,
    Math.ceil(amount / 100000) * 100000, 500000])].filter((v) => v >= amount && v > 0).slice(0, 4)

  const submit = async () => {
    if (wanted > maxPoints) {
      setError(`Hóa đơn này dùng tối đa ${maxPoints} điểm.`)
      return
    }
    if (cashShort) {
      setError('Tiền khách đưa chưa đủ.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await onSubmit({ method, customerId: customer?.id ?? null, pointsToRedeem: usePoints })
      onPaid(res.data)
    } catch (e) {
      setError(errorMessage(e, 'Thanh toán thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      show
      size="lg"
      title={title}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !cfg}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            {method === 'CASH' ? `Xác nhận đã thu ${formatMoney(amount)}` : 'Xác nhận đã nhận chuyển khoản'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="pay-step">Khách thân thiết</div>
          <CustomerPicker customer={customer} onChange={(c) => { setCustomer(c); setPoints('') }} />

          {customer && (
            <div className="mt-3">
              <label className="form-label" htmlFor="pay-points">Dùng điểm (1 điểm = {formatMoney(pointValue)})</label>
              <div className="input-group">
                <input id="pay-points" type="number" min="0" max={maxPoints} className={`form-control ${wanted > maxPoints ? 'is-invalid' : ''}`}
                       value={points} placeholder="0" disabled={maxPoints === 0} onChange={(e) => setPoints(e.target.value)} />
                <button type="button" className="btn btn-light-soft" disabled={maxPoints === 0} onClick={() => setPoints(String(maxPoints))}>
                  Dùng tối đa ({maxPoints})
                </button>
              </div>
              {maxPoints === 0 && <div className="form-text">Khách chưa đủ điểm để giảm giá.</div>}
            </div>
          )}

          <div className="pay-step mt-4">Cách thanh toán</div>
          <div className="pay-methods">
            <button type="button" className={`pay-method ${method === 'CASH' ? 'active' : ''}`} onClick={() => setMethod('CASH')}>
              <i className="bi bi-cash-stack" />Tiền mặt
            </button>
            <button type="button" className={`pay-method ${method === 'BANK_TRANSFER' ? 'active' : ''}`} onClick={() => setMethod('BANK_TRANSFER')}>
              <i className="bi bi-qr-code" />Chuyển khoản
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <div className="pay-summary">
            <div className="row-line"><span>Tạm tính</span><span>{formatMoney(subtotal)}</span></div>
            {discount > 0 && <div className="row-line pay-discount"><span>Giảm giá ({usePoints} điểm)</span><span>-{formatMoney(discount)}</span></div>}
            <div className="row-line grand"><span>Cần thu</span><span>{formatMoney(amount)}</span></div>
            {customer && earn > 0 && <div className="cell-sub mt-1">Khách được cộng {earn} điểm sau khi thanh toán.</div>}
          </div>

          {method === 'CASH' ? (
            <div className="mt-3">
              <label className="form-label" htmlFor="pay-cash">Khách đưa</label>
              <input id="pay-cash" className={`form-control ${cashShort ? 'is-invalid' : ''}`} inputMode="numeric"
                     placeholder={`${formatMoney(amount)} (để trống nếu đưa vừa đủ)`}
                     value={cash ? Number(cash).toLocaleString('vi-VN') : ''}
                     onChange={(e) => setCash(e.target.value.replace(/\D/g, '').slice(0, 12))} />
              <div className="quick-cash">
                {quick.map((v) => <button type="button" key={v} onClick={() => setCash(String(v))}>{formatMoney(v)}</button>)}
              </div>
              {cash !== '' && !cashShort && <div className="change-line">Tiền thối lại <strong>{formatMoney(cashNum - amount)}</strong></div>}
              {cashShort && <div className="invalid-feedback d-block">Còn thiếu {formatMoney(amount - cashNum)}</div>}
            </div>
          ) : (
            <div className="qr-box mt-3">
              {bankReady ? (
                <>
                  <img src={qrUrl} alt={`Mã VietQR ${formatMoney(amount)}`} />
                  <div className="small fw-semibold mt-2">{cfg.bankAccountHolder}</div>
                  <div className="cell-sub">{cfg.bankAccountNumber}</div>
                  <div className="cell-sub mt-1">Khách quét mã bằng app ngân hàng. Kiểm tra tiền đã vào tài khoản rồi mới xác nhận.</div>
                </>
              ) : (
                <div className="alert alert-warning small mb-0 text-start">
                  Chưa cài tài khoản nhận tiền nên không tạo được mã QR. Admin vào Cài đặt hệ thống, tab Bán hàng &amp; tích điểm để nhập mã ngân hàng và số tài khoản.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
