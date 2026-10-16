import { Link } from 'react-router-dom'
import { useOnline } from '../../layouts/OnlineLayout'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { unitTotal } from '../../utils/orderOptions'

export default function OnlineCart() {
  // Đọc giỏ hàng và các hàm từ Context
  const { cart, updateQuantity, removeItem } = useOnline()

  return (
    <>
      <h1 className="gx-title">Giỏ hàng của bạn</h1>

      {/* Danh sách món trong giỏ hàng thật */}
      <div className="gx-card">
        {cart.map((item) => (
          <div className="gx-line" key={item.key}>
            <div className="gx-line-main">
              <span className="gx-line-name">{item.itemName}</span>
              {itemOptionsText(item) && (
                <div className="gx-muted">{itemOptionsText(item)}</div>
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
