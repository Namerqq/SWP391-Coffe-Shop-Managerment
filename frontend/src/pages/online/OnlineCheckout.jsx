import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function OnlineCheckout() {
  const navigate = useNavigate()
  const [deliveryType, setDeliveryType] = useState('PICKUP') // 'PICKUP' hoặc 'DELIVERY'
  const [paymentMethod, setPaymentMethod] = useState('CASH') // 'CASH' hoặc 'PAYOS_QR'

  // Chuyển sang xem đơn sau khi bấm đặt
  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/online-order/orders')
  }

  return (
    <>
      <h1 className="gx-title">Thông tin đặt hàng</h1>

      <form onSubmit={handleSubmit}>
        {/* 1. Chọn cách nhận hàng */}
        <div className="gx-card mb-3 p-3">
          <label className="form-label fw-bold">1. Hình thức nhận hàng</label>
          <div className="d-flex gap-2">
            <button
              type="button"
              className={`btn flex-grow-1 ${deliveryType === 'PICKUP' ? 'btn-primary' : 'btn-light-soft'}`}
              onClick={() => setDeliveryType('PICKUP')}
            >
              <i className="bi bi-bag me-1" /> Tự đến lấy (Mang đi)
            </button>
            <button
              type="button"
              className={`btn flex-grow-1 ${deliveryType === 'DELIVERY' ? 'btn-primary' : 'btn-light-soft'}`}
              onClick={() => setDeliveryType('DELIVERY')}
            >
              <i className="bi bi-bicycle me-1" /> Giao tận nơi
            </button>
          </div>
        </div>

        {/* 2. Điền thông tin người nhận */}
        <div className="gx-card mb-3 p-3">
          <label className="form-label fw-bold">2. Thông tin người nhận</label>
          <div className="mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Họ và tên của bạn *"
              defaultValue="Nguyễn Văn A"
              required
            />
          </div>
          <div className="mb-2">
            <input
              type="tel"
              className="form-control"
              placeholder="Số điện thoại nhận hàng *"
              defaultValue="0987654321"
              required
            />
          </div>

          {deliveryType === 'DELIVERY' && (
            <div className="mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Địa chỉ giao hàng chi tiết *"
                defaultValue="Số 123 Đường Cầu Giấy, Hà Nội"
                required
              />
            </div>
          )}

          <div>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Ghi chú thêm cho quán (không bắt buộc)..."
            />
          </div>
        </div>

        {/* 3. Chọn thanh toán */}
        <div className="gx-card mb-3 p-3">
          <label className="form-label fw-bold">3. Phương thức thanh toán</label>
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
              💵 Tiền mặt khi nhận hàng (COD)
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
              📲 Chuyển khoản VietQR tự động (PayOS)
            </label>
          </div>
        </div>

        {/* Nút đặt hàng */}
        <div className="gx-actions">
          <Link to="/online-order/cart" className="btn btn-light-soft">
            Quay lại giỏ
          </Link>
          <button type="submit" className="btn btn-primary flex-grow-1 py-2">
            Xác nhận đặt hàng · 95.000đ
          </button>
        </div>
      </form>
    </>
  )
}
