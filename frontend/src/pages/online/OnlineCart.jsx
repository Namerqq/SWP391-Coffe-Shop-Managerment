import { Link } from 'react-router-dom'
import { useOnline } from '../../layouts/OnlineLayout'

export default function OnlineCart() {
  // Đọc giỏ hàng thật từ Context
  const { cart } = useOnline()

  return (
    <>
      <h1 className="gx-title">Giỏ hàng của bạn</h1>

      {/* Danh sách món trong giỏ hàng thật */}
      <div className="gx-card">
        {cart.map((item) => (
          <div className="gx-line" key={item.key}>
            <div className="gx-line-main">
              <span className="gx-line-name">{item.itemName}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Nút bấm chuyển trang */}
      <div className="gx-actions">
        <Link to="/online-order" className="btn btn-light-soft">
          + Chọn thêm món
        </Link>
        <Link to="/online-order/checkout" className="btn btn-primary flex-grow-1 py-2">
          Tiến hành thanh toán →
        </Link>
      </div>
    </>
  )
}
