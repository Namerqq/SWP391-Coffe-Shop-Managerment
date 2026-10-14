import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import usePolling from '../../utils/usePolling'
import { formatMoney } from '../../utils/orderFormat'
import { hidingQr, markQrAnnounced, mmss, shortNo, showingQr, toPaymentResult } from './qrScreen'

/**
 * Mã QR payOS chờ khách quét (dùng trong hộp thanh toán và hộp "Xem mã QR").
 * Hỏi backend mỗi 2 giây; khách trả xong hiện "Thanh toán thành công" khoảng 2 giây rồi gọi onPaid(PaymentResult),
 * thu ngân không phải bấm xác nhận. Đóng hộp KHÔNG hủy mã: khách trả lúc nào hệ thống cũng tự xác nhận.
 *  - onChange(view): mỗi lần trạng thái mã cập nhật (kể cả khi tạo mã mới)
 *  - onBack: (không bắt buộc) quay lại chọn cách thanh toán khác; hủy mã xong cũng tự quay lại
 *  - autoContinue = false: thanh toán xong không tự chuyển trang mà hiện nút Mở hóa đơn
 */
export default function QrPaymentPanel({ qr, onChange, onPaid, onBack, onClose, autoContinue = true }) {
  const [view, setView] = useState(qr)
  const [deadline, setDeadline] = useState(() => Date.now() + (qr?.secondsLeft || 0) * 1000)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [askCancel, setAskCancel] = useState(false)
  const onPaidRef = useRef(onPaid)
  onPaidRef.current = onPaid

  const apply = useCallback((v) => {
    setView(v)
    setDeadline(Date.now() + (v.secondsLeft || 0) * 1000)
    setNow(Date.now())
    onChange?.(v)
  }, [onChange])

  // Đang hiện trên màn hình -> thông báo chung không báo trùng.
  useEffect(() => {
    if (!view?.id) return undefined
    showingQr(view.id)
    return () => hidingQr(view.id)
  }, [view?.id])

  usePolling(async () => {
    if (view?.status !== 'PENDING') return
    try {
      apply((await cashierApi.getQr(view.id)).data)
    } catch {
      // mất mạng tạm thời: giữ màn hình hiện tại, lần sau hỏi lại
    }
  }, 2000)

  useEffect(() => {
    if (view?.status !== 'PENDING') return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [view?.status])

  useEffect(() => {
    if (view?.status !== 'PAID') return undefined
    markQrAnnounced(view.id)
    if (!autoContinue) return undefined
    const t = setTimeout(() => onPaidRef.current?.(toPaymentResult(view)), 1800)
    return () => clearTimeout(t)
  }, [view?.status, view?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) return null

  const run = async (call, fallback) => {
    setBusy(true)
    setError('')
    try {
      const v = (await call()).data
      apply(v)
      return v
    } catch (e) {
      setError(errorMessage(e, fallback))
      return null
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    const v = await run(() => cashierApi.cancelQr(view.id), 'Không hủy được mã QR.')
    if (!v) return
    setAskCancel(false)
    if (v.status === 'CANCELLED' && onBack) onBack()
  }
  const renew = () => run(() => cashierApi.renewQr(view.id), 'Không tạo được mã mới.')

  const where = view.target === 'TABLE'
    ? `${view.tableNumber}, đơn ${view.orderNumbers}`
    : `Mang đi, ${view.itemCount} món`
  const errorBox = error && <div className="alert alert-danger small mt-3 mb-0 text-start">{error}</div>

  if (view.status === 'PAID') {
    return (
      <div className="qr-pay qr-pay-result" role="status">
        <i className="bi bi-check-circle-fill qr-pay-done-icon" aria-hidden="true" />
        <h3 className="qr-pay-heading">Thanh toán thành công</h3>
        <p className="mb-1">
          Đã nhận {formatMoney(view.amount)}, hóa đơn {view.paymentCode}.
          {view.target === 'TAKEAWAY' && view.takeawayOrderNumber && ` Đơn ${shortNo(view.takeawayOrderNumber)} đã gửi pha chế.`}
          {view.tableReleased && ' Bàn đã trả về trống.'}
        </p>
        {autoContinue ? (
          <p className="cell-sub mb-0"><span className="spinner-border spinner-border-sm me-1" />Đang mở hóa đơn...</p>
        ) : (
          <div className="qr-pay-actions">
            {onClose && <button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>}
            <Link to={`/cashier/receipt/${view.paymentId}`} className="btn btn-primary">Mở hóa đơn</Link>
          </div>
        )}
      </div>
    )
  }

  if (view.status === 'MISMATCH') {
    return (
      <div className="qr-pay">
        <div className="alert alert-warning text-start mb-3">
          <div className="fw-semibold mb-1">Tiền QR cần kiểm tra tay</div>
          <div>{view.note}</div>
          <div className="mt-1">Mở app ngân hàng kiểm tra, rồi thu bằng Chuyển khoản thủ công hoặc hoàn tiền cho khách.</div>
        </div>
        {onClose && <button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>}
      </div>
    )
  }

  if (view.status === 'EXPIRED' || view.status === 'CANCELLED') {
    const expired = view.status === 'EXPIRED'
    return (
      <div className="qr-pay qr-pay-result">
        <i className={`bi ${expired ? 'bi-hourglass-bottom' : 'bi-x-circle'} qr-pay-closed-icon`} aria-hidden="true" />
        <h3 className="qr-pay-heading">{expired ? 'Mã QR đã hết hạn' : 'Đã hủy mã QR'}</h3>
        <p className="cell-sub mb-0">
          {expired ? 'Khách chưa chuyển tiền trong thời gian cho phép.' : 'Mã này không dùng được nữa.'}
          {' '}Tạo mã mới với cùng số tiền, hoặc chọn cách thanh toán khác.
        </p>
        {errorBox}
        <div className="qr-pay-actions">
          {onBack
            ? <button type="button" className="btn btn-light-soft" onClick={onBack} disabled={busy}>Chọn cách khác</button>
            : onClose && <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={busy}>Đóng</button>}
          <button type="button" className="btn btn-primary" onClick={renew} disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}Tạo mã mới
          </button>
        </div>
      </div>
    )
  }

  // PENDING
  const left = Math.max(0, Math.round((deadline - now) / 1000))
  const total = Math.max(1, (new Date(view.expiresAt) - new Date(view.createdAt)) / 1000)
  const percent = Math.min(100, (left / total) * 100)
  return (
    <div className="qr-pay">
      <div className="qr-pay-amount">{formatMoney(view.amount)}</div>
      <div className="qr-pay-where">
        {where}
        {view.discount > 0 && `, đã giảm ${formatMoney(view.discount)} (${view.pointsToRedeem} điểm)`}
      </div>

      <div className={`qr-pay-code${left === 0 ? ' is-stale' : ''}`}>
        <QRCodeSVG value={view.qrCode} size={224} level="M" title={`Mã QR thanh toán ${formatMoney(view.amount)}`} />
      </div>
      <p className="qr-pay-hint">Mở app ngân hàng, quét mã và xác nhận chuyển khoản.</p>

      <div className={`qr-pay-bar${left <= 60 ? ' is-low' : ''}`} aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
      <div className="qr-pay-timer">
        {left > 0 ? <>Mã hết hạn sau <strong>{mmss(left)}</strong></> : 'Đã hết giờ, đang kiểm tra lần cuối với payOS...'}
      </div>
      <div className="qr-pay-wait" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        Đang chờ khách chuyển khoản
      </div>
      <div className="cell-sub mt-1">Nội dung chuyển khoản: {view.description}</div>

      {errorBox}
      {askCancel ? (
        <div className="qr-pay-confirm">
          <div className="fw-semibold">Hủy mã QR này?</div>
          <div className="cell-sub">Chỉ hủy khi khách chưa chuyển tiền. Hủy xong có thể thu bằng cách khác.</div>
          <div className="qr-pay-actions mt-2">
            <button type="button" className="btn btn-light-soft btn-sm" onClick={() => setAskCancel(false)} disabled={busy}>Không hủy</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={cancel} disabled={busy}>
              {busy && <span className="spinner-border spinner-border-sm me-2" />}Hủy mã
            </button>
          </div>
        </div>
      ) : (
        <div className="qr-pay-actions">
          <button type="button" className="btn btn-light-soft" onClick={() => setAskCancel(true)}>Hủy mã QR</button>
          {onClose && <button type="button" className="btn btn-primary" onClick={onClose}>Đóng</button>}
        </div>
      )}
      <p className="qr-pay-note">
        Đóng hộp này mã vẫn còn hiệu lực. Khách trả lúc nào hệ thống cũng tự xác nhận và báo trên màn thu ngân.
      </p>
    </div>
  )
}
