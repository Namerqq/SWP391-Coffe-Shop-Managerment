import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import onlinePaymentApi from '../../api/onlinePaymentApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { toItemRequest, unitTotal } from '../../utils/orderOptions'

/**
 * ThangNN Iter2 — màn "Online Payment Method & Loyalty" (BF-03-2, UC-CU05 / UC-CU10). Đường dẫn: /online-pay.
 * Trang Thông tin đặt hàng (ThangDT) chuyển sang đây khi khách chọn trả QR, kèm state:
 *   { customerName, customerPhone, deliveryAddress, note, items }   (items = các dòng trong giỏ online)
 * Khách xem tổng tiền, tích / dùng điểm theo SĐT nhận hàng rồi tạo mã QR.
 * Đơn CHƯA được tạo ở đây: khách trả xong hệ thống mới tạo đơn.
 */
export default function OnlinePayment() {
  const navigate = useNavigate()
  const order = useLocation().state
  const items = useMemo(() => order?.items || [], [order])
  const [member, setMember] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [join, setJoin] = useState(false)
  const [points, setPoints] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const subtotal = useMemo(() => items.reduce((s, l) => s + unitTotal(l) * l.quantity, 0), [items])
  const itemCount = items.reduce((s, l) => s + l.quantity, 0)

  useEffect(() => {
    if (!order?.customerPhone) return
    onlinePaymentApi.lookupLoyalty(order.customerPhone)
      .then((res) => setMember(res.data))
      .catch((err) => setLookupError(errorMessage(err, 'Chưa kiểm tra được điểm thành viên.')))
  }, [order?.customerPhone])

  if (!order || items.length === 0) {
    return (
      <div className="gx-empty">
        <i className="bi bi-bag gx-empty-icon" aria-hidden="true" />
        <p>Chưa có thông tin đơn hàng để thanh toán.</p>
        <Link to="/online-order/checkout" className="btn btn-primary">Quay lại trang đặt hàng</Link>
      </div>
    )
  }

  const isMember = Boolean(member?.member)
  const pointValue = member?.pointValueVnd || 1000
  const vndPerPoint = member?.vndPerPoint || 10000
  // Số tiền trong mã QR phải lớn hơn 0đ nên điểm dùng không được trừ hết tiền đơn.
  const maxPoints = isMember ? Math.max(0, Math.min(member.points, Math.floor((subtotal - 1) / pointValue))) : 0
  const used = Math.min(maxPoints, Math.max(0, parseInt(points, 10) || 0))
  const discount = used * pointValue
  const total = subtotal - discount
  const willEarn = isMember || join ? Math.floor(total / vndPerPoint) : 0
  const ready = Boolean(member || lookupError)

  const submit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const res = await onlinePaymentApi.createQr({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        note: order.note || null,
        items: items.map(toItemRequest),
        joinLoyalty: !isMember && join,
        pointsToRedeem: used,
      })
      navigate(`/online-pay/qr?id=${encodeURIComponent(res.data.paymentLinkId)}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Chưa tạo được mã QR, vui lòng thử lại.'))
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="gx-title">Thanh toán đơn hàng</h1>

      <section className="gx-card mb-3 p-3" aria-labelledby="op-order">
        <h2 id="op-order" className="op-heading">Đơn hàng ({itemCount} món)</h2>
        {items.map((l, i) => (
          <div className="gx-order-line" key={l.key || i}>
            <span className="gx-order-qty">{l.quantity}×</span>
            <div className="flex-grow-1">
              <div>{l.itemName}</div>
              {itemOptionsText(l) && <div className="gx-muted">{itemOptionsText(l)}</div>}
            </div>
            <span>{formatMoney(unitTotal(l) * l.quantity)}</span>
          </div>
        ))}
        <div className="op-ship gx-muted">
          Giao cho <strong>{order.customerName}</strong>, {order.customerPhone}
          <br />
          {order.deliveryAddress}
        </div>
      </section>

      <section className="gx-card mb-3 p-3" aria-labelledby="op-loyalty">
        <h2 id="op-loyalty" className="op-heading">Tích điểm thành viên</h2>
        {!ready && <p className="gx-muted mb-0">Đang kiểm tra số {order.customerPhone}…</p>}
        {lookupError && <p className="gx-muted mb-0">{lookupError} Bạn vẫn thanh toán được, đơn này không tích điểm.</p>}
        {isMember && (
          <>
            <p className="mb-2">
              Số {member.phoneNumber}{member.fullName ? ` (${member.fullName})` : ''} đang có <strong>{member.points} điểm</strong>.
              Đơn này được cộng điểm tự động.
            </p>
            {maxPoints > 0 ? (
              <label className="op-points">
                <span>Dùng điểm, tối đa {maxPoints} (1 điểm = {formatMoney(pointValue)})</span>
                <input type="text" inputMode="numeric" className="form-control" placeholder="0" value={points}
                       onChange={(e) => setPoints(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </label>
            ) : (
              <p className="gx-muted mb-0">Chưa đủ điểm để giảm cho đơn này.</p>
            )}
          </>
        )}
        {member && !isMember && (
          <div className="form-check">
            <input id="op-join" type="checkbox" className="form-check-input" checked={join}
                   onChange={(e) => setJoin(e.target.checked)} />
            <label htmlFor="op-join" className="form-check-label">
              Đăng ký thành viên bằng số {member.phoneNumber} để tích điểm cho đơn này
            </label>
          </div>
        )}
      </section>

      <div className="gx-summary">
        <div><span>Tạm tính</span><span>{formatMoney(subtotal)}</span></div>
        {discount > 0 && <div><span>Giảm bằng {used} điểm</span><span>−{formatMoney(discount)}</span></div>}
        <div><span>Cần thanh toán</span><strong>{formatMoney(total)}</strong></div>
        {willEarn > 0 && <p>Sau khi thanh toán, số {order.customerPhone} được cộng {willEarn} điểm.</p>}
        <p>Thanh toán bằng chuyển khoản QR. Đơn được tạo và gửi pha chế ngay khi quán nhận được tiền.</p>
      </div>

      {error && (
        <div className="gx-alert" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="gx-actions">
        <Link to="/online-order/checkout" className="btn btn-light-soft">Quay lại</Link>
        <button type="button" className="btn btn-primary flex-grow-1 py-2" disabled={submitting || !ready} onClick={submit}>
          {submitting ? 'Đang tạo mã QR…' : `Tạo mã QR thanh toán ${formatMoney(total)}`}
        </button>
      </div>
    </>
  )
}
