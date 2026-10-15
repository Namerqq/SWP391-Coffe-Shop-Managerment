import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function OnlineCart() {
  // Món mẫu trong giỏ
  const [items, setItems] = useState([
    {
      id: 1,
      name: 'Bạc xỉu',
      options: 'Size M · 50% đường · 100% đá',
      note: 'Cho sữa đặc riêng giúp mình',
      quantity: 1,
      price: '50.000đ',
    },
    {
      id: 2,
      name: 'Trà đào cam sả',
      options: 'Size L · 70% đường · Thêm đào miếng',
      note: '',
      quantity: 1,
      price: '45.000đ',
    },
  ])

  // Đổi số lượng
  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    )
  }

  // Xóa món
  const deleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <>
      <h1 className="gx-title">Giỏ hàng của bạn</h1>

      {/* Danh sách món */}
      <div className="gx-card">
        {items.map((item) => (
          <div className="gx-line" key={item.id}>
            <div className="gx-line-main">
              <span className="gx-line-name">{item.name}</span>
              <div className="gx-muted">{item.options}</div>
              {item.note && <div className="gx-note">{item.note}</div>}

              {/* Tăng/giảm số lượng & nút xóa */}
              <div className="gx-line-actions">
                <div className="gx-qty sm">
                  <button type="button" onClick={() => changeQty(item.id, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item.id, 1)}>+</button>
                </div>
                <button
                  type="button"
                  className="gx-link danger"
                  onClick={() => deleteItem(item.id)}
                >
                  Xóa
                </button>
              </div>
            </div>

            <div className="gx-line-price">{item.price}</div>
          </div>
        ))}
      </div>

      {/* Tổng tiền */}
      <div className="gx-summary">
        <div>
          <span>Tổng số lượng: {items.reduce((s, i) => s + i.quantity, 0)} món</span>
          <strong>95.000đ</strong>
        </div>
      </div>

      {/* Nút bấm chuyển trang */}
      <div className="gx-actions">
        <Link to="/online-order" className="btn btn-light-soft">
          + Chọn thêm món
        </Link>
        <Link to="/online-order/checkout" className="btn btn-primary flex-grow-1 py-2">
          Tiến hành thanh toán (95.000đ) →
        </Link>
      </div>
    </>
  )
}
