import { Link } from 'react-router-dom'

const STEPS = ['Đã nhận đơn', 'Đang pha chế', 'Chờ bạn lấy', 'Hoàn tất']

export default function OnlineTracking() {
  const currentStep = 1 // 0: Nhận đơn, 1: Đang pha, 2: Chờ lấy, 3: Xong

  return (
    <>
      <h1 className="gx-title">Đơn hàng của bạn</h1>

      {/* Thông tin đơn hàng */}
      <article className="gx-card gx-order">
        <header>
          <div>
            <span className="gx-order-no">#ONLINE-8921</span>
            <span className="gx-muted"> · Vừa đặt cách đây 2 phút</span>
          </div>
          <span className="badge bg-warning text-dark px-2 py-1">Đang chuẩn bị</span>
        </header>

        {/* 4 bước tiến trình */}
        <ol className="gx-steps" aria-label="Tiến độ đơn">
          {STEPS.map((label, idx) => (
            <li
              key={label}
              className={idx < currentStep ? 'done' : idx === currentStep ? 'current' : ''}
            >
              <span />
              {label}
            </li>
          ))}
        </ol>

        {/* Món trong đơn */}
        <div className="gx-order-line">
          <span className="gx-order-qty">1×</span>
          <div className="flex-grow-1">
            <div>Bạc xỉu</div>
            <div className="gx-muted">Size M · 50% đường · 100% đá</div>
          </div>
          <span className="gx-price">50.000đ</span>
        </div>

        <div className="gx-order-line">
          <span className="gx-order-qty">1×</span>
          <div className="flex-grow-1">
            <div>Trà đào cam sả</div>
            <div className="gx-muted">Size L · 70% đường · Thêm đào miếng</div>
          </div>
          <span className="gx-price">45.000đ</span>
        </div>

        <div className="gx-order-foot">
          <span>Phương thức: <b>Tự đến lấy (Mang đi)</b></span>
          <span className="gx-price fs-5">95.000đ</span>
        </div>
      </article>

      {/* Nút quay lại */}
      <div className="text-center mt-4">
        <Link to="/online-order" className="btn btn-light-soft">
          ← Quay lại xem thực đơn
        </Link>
      </div>
    </>
  )
}
