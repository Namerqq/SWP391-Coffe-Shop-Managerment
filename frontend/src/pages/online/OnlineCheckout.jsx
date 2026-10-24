import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useOnline } from '../../layouts/OnlineLayout'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { toItemRequest, unitTotal } from '../../utils/orderOptions'
import onlineOrderApi from '../../api/onlineOrderApi'
import { errorMessage } from '../../api/axiosClient'
import { setCurrentOrderCode } from '../../utils/onlineOrderCode'

const PHONE_REGEX = /^0\d{9}$/

export default function OnlineCheckout() {
  const navigate = useNavigate()
  const { cart, totalCount, totalPrice, clearCart } = useOnline()

  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Giỏ trống thì quay về thực đơn
  if (cart.length === 0) {
    return <Navigate to="/online-order" replace />
  }

  const change = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Vui lòng nhập họ và tên.')
    if (!PHONE_REGEX.test(form.phone.trim())) return setError('Số điện thoại phải gồm 10 số, bắt đầu bằng 0.')
    if (!form.address.trim()) return setError('Vui lòng nhập địa chỉ giao hàng.')
    setError('')
    if (paymentMethod === 'PAYOS_QR') {
      // ThangNN Iter2: trả QR -> sang trang thanh toán. Đơn chỉ được tạo sau khi khách trả xong.
      navigate('/online-pay', {
        state: {
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          deliveryAddress: form.address.trim(),
          note: form.note.trim(),
          items: cart,
        },
      })
      return
    }
    setSubmitting(true)

    try {
      // Chuẩn bị dữ liệu gửi lên backend
      const payload = {
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        deliveryAddress: form.address.trim(),
        note: form.note.trim() || null,
        paymentMethod,
        items: cart.map(toItemRequest),
      }

      const res = await onlineOrderApi.placeOrder(payload)

      // Ghi nhớ mã đơn vừa đặt trên máy này rồi mới chuyển trang: trang Theo dõi mở đúng đơn này
      // và hiện popup báo mã đơn cho khách (khách cần mã để xem lại đơn / hóa đơn).
      const code = res?.data?.orderNumber
      if (code) setCurrentOrderCode(code)
      navigate('/online-order/orders', { state: code ? { newOrderCode: code } : undefined })
      if (clearCart) clearCart()
    } catch (err) {
      setError(errorMessage(err, 'Đặt hàng chưa thành công, vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="gx-title">Thông tin đặt hàng</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="gx-card mb-3 p-3">
          <label className="form-label fw-bold">1. Thông tin giao hàng</label>
          <div className="mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Họ và tên của bạn *"
              value={form.name}
              onChange={change('name')}
              maxLength={100}
            />
          </div>
          <div className="mb-2">
            <input
              type="tel"
              className="form-control"
              placeholder="Số điện thoại nhận hàng *"
              value={form.phone}
              onChange={change('phone')}
              maxLength={10}
              inputMode="numeric"
            />
          </div>

          <div className="mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Địa chỉ giao hàng chi tiết *"
              value={form.address}
              onChange={change('address')}
              maxLength={500}
            />
          </div>

          <div>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Ghi chú thêm cho quán (không bắt buộc)..."
              value={form.note}
              onChange={change('note')}
              maxLength={500}
            />
          </div>
        </div>

        {/* 2. Chọn thanh toán */}
        <div className="gx-card mb-3 p-3">
          <label className="form-label fw-bold">2. Phương thức thanh toán</label>
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="radio"
              id="pay-cash"
              name="payment"
              checked={paymentMethod === 'CASH'}
              onChange={() => setPaymentMethod('CASH')}
            />
            <label className="form-check-label" htmlFor="pay-cash">
              <i className="bi bi-cash-coin me-1" /> Tiền mặt khi nhận hàng (COD)
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              id="pay-qr"
              name="payment"
              checked={paymentMethod === 'PAYOS_QR'}
              onChange={() => setPaymentMethod('PAYOS_QR')}
            />
            <label className="form-check-label" htmlFor="pay-qr">
              <i className="bi bi-qr-code me-1" /> Chuyển khoản VietQR (QR)
            </label>
          </div>
        </div>

        {/* 3. Tóm tắt đơn hàng */}
        <div className="gx-card mb-3 p-3">
          <label className="form-label fw-bold">3. Đơn hàng ({totalCount} món)</label>
          {cart.map((item) => (
            <div className="gx-order-line" key={item.key}>
              <span className="gx-order-qty">{item.quantity}×</span>
              <div className="flex-grow-1">
                <div>{item.itemName}</div>
                {itemOptionsText(item) && <div className="gx-muted">{itemOptionsText(item)}</div>}
              </div>
              <span className="gx-price">{formatMoney(unitTotal(item) * item.quantity)}</span>
            </div>
          ))}
          <div className="gx-order-foot">
            <span>Tổng cộng</span>
            <span className="gx-price fs-5"> {formatMoney(totalPrice)}</span>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        {/* Nút đặt hàng */}
        <div className="gx-actions">
          <Link to="/online-order/cart" className="btn btn-light-soft">
            Quay lại giỏ
          </Link>
          <button type="submit" className="btn btn-primary flex-grow-1 py-2" disabled={submitting}>
            {submitting && <span className="spinner-border spinner-border-sm me-2" />}
            Xác nhận đặt hàng · {formatMoney(totalPrice)}
          </button>
        </div>
      </form>
    </>
  )
}
