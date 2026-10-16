import { Link } from 'react-router-dom'

// Giao diện mẫu, chưa có logic
// TODO: lấy đơn thật từ API khi có backend
const DELIVERY_STEPS = ['Đã nhận đơn', 'Đang giao', 'Đã giao']

export default function OnlineTracking() {
  const currentStep = 0 // 0: Đã nhận đơn, 1: Đang giao, 2: Đã giao

  return (
    <>
      <h1 className="gx-title">Đơn hàng của bạn</h1>

      <article className="gx-card gx-order mb-3">
        {/* Mã đơn & trạng thái */}
        <header>
          <div>
            <span className="gx-order-no">#ONL-8921</span>
            <span className="gx-muted"> · 5 phút trước</span>
          </div>
          <span className="badge bg-warning text-dark px-2 py-1">Đã nhận đơn</span>
        </header>

        {/* Thanh tiến trình 3 bước */}
        <ol className="gx-steps" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} aria-label="Tiến độ giao hàng">
          {DELIVERY_STEPS.map((label, idx) => (
            <li key={label} className={idx < currentStep ? 'done' : idx === currentStep ? 'current' : ''}>
              <span />
              {label}
            </li>
          ))}
        </ol>

        {/* Thông tin người nhận */}
        <div className="bg-light rounded p-2 mb-3 text-secondary" style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
          <div>
            <strong className="text-dark">Người nhận:</strong> Nguyễn Văn A (0987654321)
          </div>
          <div>
            <strong className="text-dark">Địa chỉ giao:</strong> Số 12, Ngõ 45, Đường Cầu Giấy, Hà Nội
          </div>
          <div>
            <strong className="text-dark">Ghi chú:</strong> Giao trước 12h giúp mình nhé
          </div>
        </div>

        {/* Món trong đơn */}
        <div className="gx-order-line">
          <span className="gx-order-qty">1×</span>
          <div className="flex-grow-1">
            <div>Bạc xỉu</div>
            <div className="gx-muted">Size M, 50% đường</div>
          </div>
          <span className="gx-price">50.000đ</span>
        </div>

        <div className="gx-order-line">
          <span className="gx-order-qty">1×</span>
          <div className="flex-grow-1">
            <div>Trà đào cam sả</div>
            <div className="gx-muted">Size L, 70% đường, + Trân châu trắng</div>
          </div>
          <span className="gx-price">45.000đ</span>
        </div>

        {/* Tổng tiền */}
        <footer>
          <span>Tổng tiền:</span>
          <span className="gx-price fs-5">95.000đ</span>
        </footer>

        {/* Nút hủy đơn (chưa có chức năng) */}
        <div className="text-end mt-2 pt-2 border-top">
          <button type="button" className="btn btn-outline-danger btn-sm">
            Hủy đơn hàng
          </button>
        </div>
      </article>

      {/* Nút quay lại */}
      <div className="text-center mt-3 mb-4">
        <Link to="/online-order" className="btn btn-light-soft">
          ← Quay lại xem thực đơn
        </Link>
      </div>
    </>
  )
}
