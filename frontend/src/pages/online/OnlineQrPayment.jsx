import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import onlinePaymentApi from '../../api/onlinePaymentApi'
import { errorMessage } from '../../api/axiosClient'
import usePolling from '../../utils/usePolling'
import { formatMoney } from '../../utils/orderFormat'

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * ThangNN Iter2 — màn "Online QR Payment" (UC-CU10). Đường dẫn: /online-pay/qr?id=<paymentLinkId>.
 * payOS cũng đưa khách về đúng trang này (kèm ?id=...) sau khi trả / hủy trên trang thanh toán của payOS.
 * Hỏi backend mỗi 3 giây; backend tự biết khách đã trả qua webhook + hỏi payOS định kỳ.
 */
export default function OnlineQrPayment() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const [qr, setQr] = useState(null)
  const [error, setError] = useState('')
  const [left, setLeft] = useState(0)
  const cartCleared = useRef(false)

  const load = useCallback(async () => {
    if (!id || (qr && qr.status !== 'PENDING')) return // mã đã xong thì thôi không hỏi nữa
    try {
      const data = (await onlinePaymentApi.getQr(id)).data
      setQr(data)
      setLeft(data.secondsLeft)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Không tìm thấy mã thanh toán.'))
    }
  }, [id, qr])
  usePolling(load, 3000)

  // Đếm ngược mỗi giây giữa 2 lần hỏi backend.
  useEffect(() => {
    if (qr?.status !== 'PENDING') return undefined
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [qr?.status])

  // Trả xong: xóa giỏ hàng online (giỏ của trang đặt hàng lưu trong localStorage).
  useEffect(() => {
    if (qr?.status === 'PAID' && !cartCleared.current) {
      cartCleared.current = true
      try {
        localStorage.removeItem('online_cart')
      } catch {
        // trình duyệt chặn localStorage: bỏ qua
      }
    }
  }, [qr?.status])

  if (!id || (!qr && error)) {
    return (
      <div className="gx-empty">
        <i className="bi bi-qr-code gx-empty-icon" aria-hidden="true" />
        <p>{id ? error : 'Đường dẫn thiếu mã thanh toán.'}</p>
        <Link to="/online-order" className="btn btn-primary">Về thực đơn</Link>
      </div>
    )
  }
  if (!qr) return <p className="gx-muted text-center py-5">Đang tải mã QR…</p>

  if (qr.status === 'PAID') {
    return (
      <section className="op-result" role="status">
        <i className="bi bi-check-circle-fill" aria-hidden="true" />
        <h1 className="gx-title justify-content-center">Đã thanh toán {formatMoney(qr.amount)}</h1>
        <p>Đơn {qr.orderNumber} đã được tạo và gửi pha chế. Quán sẽ giao tới địa chỉ bạn đã nhập.</p>
        <div className="gx-actions justify-content-center">
          <Link className="btn btn-light-soft" to={`/online-receipts?phone=${encodeURIComponent(qr.customerPhone)}`}>Xem hóa đơn</Link>
          <Link className="btn btn-primary" to="/online-order">Về thực đơn</Link>
        </div>
      </section>
    )
  }

  if (qr.status === 'MISMATCH') {
    return (
      <section className="op-result is-warning" role="alert">
        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
        <h1 className="gx-title justify-content-center">Quán đã nhận tiền, đơn cần xác nhận tay</h1>
        <p>
          Khoản chuyển {formatMoney(qr.amount)} (nội dung {qr.description}) đã về nhưng hệ thống chưa tạo được đơn tự động.
          Quán đã được báo và sẽ liên hệ số {qr.customerPhone} để giao đơn hoặc hoàn tiền.
        </p>
      </section>
    )
  }

  if (qr.status !== 'PENDING') {
    const cancelled = qr.status === 'CANCELLED'
    return (
      <section className="op-result is-closed" role="status">
        <i className="bi bi-clock-history" aria-hidden="true" />
        <h1 className="gx-title justify-content-center">{cancelled ? 'Mã QR đã bị hủy' : 'Mã QR đã hết hạn'}</h1>
        <p>Đơn chưa được tạo và bạn chưa bị trừ tiền. Giỏ hàng vẫn còn, bạn có thể đặt lại.</p>
        <div className="gx-actions justify-content-center">
          <Link className="btn btn-primary" to="/online-order/checkout">Đặt lại</Link>
        </div>
      </section>
    )
  }

  return (
    <>
      <h1 className="gx-title">Quét mã để thanh toán</h1>
      <section className="gx-card op-qr p-3">
        <div className="op-qr-code">
          <QRCodeSVG value={qr.qrCode} size={232} level="M" title={`Mã QR thanh toán ${formatMoney(qr.amount)}`} />
        </div>
        <div className="op-amount">{formatMoney(qr.amount)}</div>
        <dl className="op-facts">
          <div><dt>Nội dung chuyển khoản</dt><dd>{qr.description}</dd></div>
          <div><dt>Mã hết hạn sau</dt><dd aria-live="polite">{left > 0 ? mmss(left) : 'đang kiểm tra lần cuối'}</dd></div>
          {qr.discount > 0 && <div><dt>Đã giảm bằng {qr.pointsToRedeem} điểm</dt><dd>−{formatMoney(qr.discount)}</dd></div>}
        </dl>
        <p className="gx-muted">
          Mở app ngân hàng, quét mã và giữ nguyên số tiền, nội dung chuyển khoản. Trang này tự cập nhật khi quán nhận được tiền.
        </p>
        {qr.checkoutUrl && (
          <a className="btn btn-light-soft w-100" href={qr.checkoutUrl}>Thanh toán trên điện thoại này</a>
        )}
      </section>
    </>
  )
}
