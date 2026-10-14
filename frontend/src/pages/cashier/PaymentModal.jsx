import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'
import CustomerPicker from './CustomerPicker'
import QrPaymentPanel from './QrPaymentPanel'

// 3 cách thanh toán. QR = mã payOS, hệ thống tự xác nhận khi tiền về (thu ngân không bấm xác nhận).
const METHODS = [
  { key: 'CASH', icon: 'bi-cash-stack', label: 'Tiền mặt', hint: 'Thu ngân nhận tiền rồi xác nhận' },
  { key: 'QR', icon: 'bi-qr-code-scan', label: 'Quét mã QR', hint: 'Khách chuyển khoản, hệ thống tự xác nhận' },
  { key: 'BANK_TRANSFER', icon: 'bi-bank', label: 'Chuyển khoản thủ công', hint: 'Dự phòng: thu ngân tự kiểm tra tiền về' },
]

/**
 * Payment Confirmation — UC-C05, C07 (chọn cách trả), C08 (xác nhận), C11 (dùng điểm), C14 (cộng điểm).
 * onSubmit({ method, customerId, pointsToRedeem }) cho Tiền mặt / Chuyển khoản thủ công, trả về Promise axios
 * ({ data: PaymentResult }).
 * onCreateQr({ customerId, pointsToRedeem }) cho Quét mã QR, trả về Promise axios ({ data: QrPaymentView });
 * không truyền thì ẩn cách này. onQrChange(view): trạng thái mã QR vừa tạo thay đổi.
 * onPaid(PaymentResult) chạy khi thu xong (kể cả QR tự xác nhận).
 * description (không bắt buộc): 1 dòng ngắn phía trên phần tiền, vd các đơn đang được thu.
 */
export default function PaymentModal({ show, title, subtotal, description, initialCustomer, transferNote, onClose, onSubmit, onCreateQr, onQrChange, onPaid }) {
  const [cfg, setCfg] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [points, setPoints] = useState('')
  const [method, setMethod] = useState('CASH')
  const [cash, setCash] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [qr, setQr] = useState(null) // mã QR vừa tạo: hộp chuyển sang màn hình mã QR

  useEffect(() => {
    if (!show) return
    setCustomer(initialCustomer || null)
    setPoints('')
    setMethod('CASH')
    setCash('')
    setError('')
    setQr(null)
    cashierApi.getPaymentSettings()
      .then((res) => setCfg(res.data))
      .catch(() => setCfg({ pointValueVnd: 1000, vndPerPoint: 10000 }))
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null

  if (qr) {
    const changed = (v) => {
      setQr(v)
      onQrChange?.(v)
    }
    return (
      <Modal show title={title} onClose={onClose}>
        <QrPaymentPanel key={qr.id} qr={qr} onChange={changed} onPaid={onPaid} onBack={() => setQr(null)} onClose={onClose} />
      </Modal>
    )
  }

  const pointValue = cfg?.pointValueVnd || 1000
  const maxPoints = customer ? Math.max(0, Math.min(customer.currentPoints, Math.floor(subtotal / pointValue))) : 0
  const wanted = parseInt(points, 10) || 0
  const usePoints = Math.min(Math.max(0, wanted), maxPoints)
  const discount = usePoints * pointValue
  const amount = subtotal - discount
  const earn = customer ? Math.floor(amount / (cfg?.vndPerPoint || 10000)) : 0
  const cashNum = parseInt(cash, 10) || 0
  const cashShort = method === 'CASH' && cash !== '' && cashNum < amount
  const qrReady = !!(cfg?.qrEnabled && onCreateQr)
  const bankReady = !!(cfg?.bankBin && cfg?.bankAccountNumber)
  const qrUrl = bankReady
    ? `https://img.vietqr.io/image/${encodeURIComponent(cfg.bankBin)}-${encodeURIComponent(cfg.bankAccountNumber)}-compact2.png`
      + `?amount=${amount}&addInfo=${encodeURIComponent(transferNote || 'Thanh toan')}`
      + `&accountName=${encodeURIComponent(cfg.bankAccountHolder || '')}`
    : ''
  const quick = [...new Set([amount, Math.ceil(amount / 10000) * 10000, Math.ceil(amount / 50000) * 50000,
    Math.ceil(amount / 100000) * 100000, 500000])].filter((v) => v >= amount && v > 0).slice(0, 4)
  const methods = METHODS.filter((m) => m.key !== 'QR' || onCreateQr)

  const submit = async () => {
    if (wanted > maxPoints) {
      setError(`Hóa đơn này dùng tối đa ${maxPoints} điểm.`)
      return
    }
    if (cashShort) {
      setError('Tiền khách đưa chưa đủ.')
      return
    }
    if (method === 'QR' && amount <= 0) {
      setError('Số tiền cần thu là 0đ nên không cần mã QR. Chọn Tiền mặt để xác nhận.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (method === 'QR') {
        const res = await onCreateQr({ customerId: customer?.id ?? null, pointsToRedeem: usePoints })
        setQr(res.data)
        onQrChange?.(res.data)
      } else {
        const res = await onSubmit({ method, customerId: customer?.id ?? null, pointsToRedeem: usePoints })
        onPaid(res.data)
      }
    } catch (e) {
      setError(errorMessage(e, method === 'QR' ? 'Không tạo được mã QR.' : 'Thanh toán thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  const submitLabel = method === 'CASH' ? `Xác nhận đã thu ${formatMoney(amount)}`
    : method === 'QR' ? `Tạo mã QR ${formatMoney(amount)}` : 'Xác nhận đã nhận chuyển khoản'

  return (
    <Modal
      show
      size="lg"
      title={title}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="button" className="btn btn-primary" onClick={submit}
                  disabled={saving || !cfg || (method === 'QR' && (!qrReady || amount <= 0))}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            {submitLabel}
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
          <div className="pay-methods" role="radiogroup" aria-label="Cách thanh toán">
            {methods.map((m) => (
              <button type="button" key={m.key} role="radio" aria-checked={method === m.key}
                      className={`pay-method ${method === m.key ? 'active' : ''}`} onClick={() => { setMethod(m.key); setError('') }}>
                <i className={`bi ${m.icon}`} aria-hidden="true" />
                <span>
                  {m.label}
                  <small>{m.key === 'QR' && cfg && !cfg.qrEnabled ? 'Chưa cấu hình payOS trên máy chủ' : m.hint}</small>
                </span>
              </button>
            ))}
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

          {method === 'CASH' && (
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
          )}

          {method === 'QR' && (
            <div className="qr-intro mt-3">
              {!qrReady ? (
                <div className="alert alert-warning small mb-0">
                  Máy chủ chưa có key payOS nên chưa tạo được mã QR. Chọn Tiền mặt hoặc Chuyển khoản thủ công.
                </div>
              ) : amount <= 0 ? (
                <div className="alert alert-info small mb-0">Số tiền cần thu là 0đ nên không cần mã QR. Chọn Tiền mặt để xác nhận.</div>
              ) : (
                <>
                  <i className="bi bi-qr-code-scan" aria-hidden="true" />
                  <div>
                    <div className="fw-semibold">Khách quét mã, hệ thống tự xác nhận</div>
                    <div className="cell-sub">
                      Bấm Tạo mã QR rồi quay màn hình cho khách quét. Tiền về là hóa đơn tự được xác nhận, thu ngân không cần bấm gì.
                      Mã tồn tại {cfg.qrTimeoutMinutes} phút.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {method === 'BANK_TRANSFER' && (
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
