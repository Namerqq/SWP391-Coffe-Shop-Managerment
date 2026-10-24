import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import onlinePaymentApi from '../../api/onlinePaymentApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { toItemRequest, unitTotal } from '../../utils/orderOptions'

/**
 * ThangNN Iter2 — màn "Online Payment Method" (BF-03-2, UC-CU05 / UC-CU10). Đường dẫn: /online-pay.
 * Trang Thông tin đặt hàng (ThangDT) chuyển sang đây khi khách chọn trả QR, kèm state:
 *   { customerName, customerPhone, deliveryAddress, note, items }   (items = các dòng trong giỏ online)
 * Khách xem lại đơn, tổng tiền rồi tạo mã QR. Khách online không tích điểm và không dùng điểm.
 * Đơn CHƯA được tạo ở đây: khách trả xong hệ thống mới tạo đơn.
 */
export default function OnlinePayment() {
  const navigate = useNavigate()
  const order = useLocation().state
  const items = useMemo(() => order?.items || [], [order])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const total = useMemo(() => items.reduce((s, l) => s + unitTotal(l) * l.quantity, 0), [items])
  const itemCount = items.reduce((s, l) => s + l.quantity, 0)

  if (!order || items.length === 0) {
    return (
      <div className="gx-empty">
        <i className="bi bi-bag gx-empty-icon" aria-hidden="true" />
        <p>Chưa có thông tin đơn hàng để thanh toán.</p>
        <Link to="/online-order/checkout" className="btn btn-primary">Quay lại trang đặt hàng</Link>
      </div>
    )
  }

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

      <div className="gx-summary">
        <div><span>Cần thanh toán</span><strong>{formatMoney(total)}</strong></div>
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
        <button type="button" className="btn btn-primary flex-grow-1 py-2" disabled={submitting} onClick={submit}>
          {submitting ? 'Đang tạo mã QR…' : `Tạo mã QR thanh toán ${formatMoney(total)}`}
        </button>
      </div>
    </>
  )
}
