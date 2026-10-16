import { Link } from 'react-router-dom'
import { useOnline } from '../../layouts/OnlineLayout'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { unitTotal } from '../../utils/orderOptions'

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
              {/* Hiển thị tuỳ chọn: Size, đường, đá, topping */}
              {itemOptionsText(item) && (
                <div className="gx-muted">{itemOptionsText(item)}</div>
              )}
              {/* Ghi chú riêng của món */}
              {item.note && <div className="gx-note">{item.note}</div>}
            </div>
            {/* Thành tiền của từng món */}
            <div className="gx-line-price">{formatMoney(unitTotal(item) * item.quantity)}</div>
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
