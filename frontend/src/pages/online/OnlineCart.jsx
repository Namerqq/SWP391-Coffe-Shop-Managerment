import { Link } from 'react-router-dom'
import { useOnline } from '../../layouts/OnlineLayout'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { unitTotal } from '../../utils/orderOptions'

export default function OnlineCart() {
  
  const { cart, totalCount, totalPrice, updateQuantity, removeItem } = useOnline()

  // Giao diện khi giỏ hàng chưa có món nào
  if (cart.length === 0) {
    return (
      <div className="gx-empty">
        <i className="bi bi-bag gx-empty-icon" />
        <p>Giỏ hàng của bạn đang trống.</p>
        <Link to="/online-order" className="btn btn-primary">
          Xem thực đơn
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="gx-title">Giỏ hàng của bạn</h1>

      {/* Danh sách món trong giỏ hàng thật */}
      <div className="gx-card">
        {cart.map((item) => (
          <div className="gx-line" key={item.key}>
            <div className="gx-line-main">
              <span className="gx-line-name">{item.itemName}</span>
              {itemOptionsText(item, { showDefaults: true }) && (
                <div className="gx-muted">{itemOptionsText(item, { showDefaults: true })}</div>
              )}

              {item.note && <div className="gx-note">{item.note}</div>}
              {/* Tăng / giảm số lượng & Nút Xóa */}
              <div className="gx-line-actions">
                <div className="gx-qty sm" aria-label={`Số lượng ${item.itemName}`}>
                  <button
                    type="button"
                    aria-label="Giảm"
                    disabled={item.quantity <= 1}
                    onClick={() => updateQuantity(item.key, -1)}
                  > −</button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Tăng"
                    disabled={item.quantity >= 50}
                    onClick={() => updateQuantity(item.key, 1)}
                  >+</button>
                </div>
                
                <button
                  type="button"
                  className="gx-link danger"
                  onClick={() => removeItem(item.key)}
                >Xóa 
                </button>
              </div>
            </div>
            <div className="gx-line-price">{formatMoney(unitTotal(item) * item.quantity)}</div>
          </div>
        ))}
      </div>

      {/* Tổng kết tiền giỏ hàng */}
      <div className="gx-summary">
        <div>
          <span>Tổng cộng ({totalCount} món)</span>
          <strong>{formatMoney(totalPrice)}</strong>
        </div>
        <p>Phí giao hàng sẽ được tính ở bước thanh toán.</p>
      </div>

      {/* Nút bấm chuyển trang */}
      <div className="gx-actions">
        <Link to="/online-order" className="btn btn-light-soft">
          + Chọn thêm món
        </Link>
        <Link to="/online-order/checkout" className="btn btn-primary flex-grow-1 py-2">
          Thanh toán · {formatMoney(totalPrice)} →
        </Link>
      </div>
    </>
  )
}
