import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'
import CustomerPicker from './CustomerPicker'

/**
 * Payment Confirmation — UC-C05, C07 (chọn cách trả), C08 (xác nhận), C11 (dùng điểm), C14 (cộng điểm).
 * onSubmit({ method, customerId, pointsToRedeem }) phải trả về Promise của axios ({ data: PaymentResult }).
 * description (không bắt buộc): 1 dòng ngắn phía trên phần tiền, vd các đơn đang được thu.
 */
export default function PaymentModal({ show, title, subtotal, description, initialCustomer, transferNote, onClose, onSubmit, onPaid }) {
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
          {description && <div className="cell-sub mb-2">{description}</div>}
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
