import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import guestOrderApi from '../../api/guestOrderApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { useGuest } from '../../layouts/GuestLayout'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { findMenuItem, toItemRequest, unitTotal } from '../../utils/orderOptions'

// Cart & Confirm Order — UC-CU02 Place Order. Sửa thoải mái trước khi gửi; đã gửi thì chỉ hủy được khi còn Chờ pha.
export default function GuestCart() {
  const navigate = useNavigate()
  const toast = useToast()
  const { table, menu, cart, count, total, pickItem, setQty, removeLine, clearCart, requestKey, expire } = useGuest()
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const editLine = (l) => pickItem(findMenuItem(menu, l.menuItemId) || { id: l.menuItemId, name: l.itemName, price: l.unitPrice }, l)

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const res = await guestOrderApi.placeOrder({ items: cart.map(toItemRequest), note: note.trim() || null, requestKey: requestKey() })
      clearCart()
      setNote('')
      toast(`Đã gửi đơn ${res.data.displayNumber}. Quán đang chuẩn bị cho bạn.`)
      navigate('/orders')
    } catch (e) {
      if (e.response?.status === 410) expire(errorMessage(e))
      else setError(errorMessage(e, 'Gửi đơn chưa được, vui lòng thử lại.'))
    } finally {
      setSending(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="gx-empty">
        <i className="bi bi-bag gx-empty-icon" />
        <p>Giỏ hàng đang trống.</p>
        <Link to="/menu" className="btn btn-primary">Xem thực đơn</Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="gx-title">Giỏ hàng {table && <span>{table.tableNumber}</span>}</h1>

      <div className="gx-card">
        {cart.map((l) => (
          <div className="gx-line" key={l.key}>
            <div className="gx-line-main">
              <button type="button" className="gx-line-name" onClick={() => editLine(l)} title="Sửa lựa chọn">{l.itemName}</button>
              {itemOptionsText(l) && <div className="gx-muted">{itemOptionsText(l)}</div>}
              {l.note && <div className="gx-note">{l.note}</div>}
              <div className="gx-line-actions">
                <div className="gx-qty sm" aria-label={`Số lượng ${l.itemName}`}>
                  <button type="button" aria-label="Giảm" disabled={l.quantity <= 1} onClick={() => setQty(l.key, -1)}>−</button>
                  <span>{l.quantity}</span>
                  <button type="button" aria-label="Tăng" disabled={l.quantity >= 50} onClick={() => setQty(l.key, 1)}>+</button>
                </div>
                <button type="button" className="gx-link" onClick={() => editLine(l)}>Sửa</button>
                <button type="button" className="gx-link danger" onClick={() => removeLine(l.key)}>Bỏ</button>
              </div>
            </div>
            <div className="gx-line-price">{formatMoney(unitTotal(l) * l.quantity)}</div>
          </div>
        ))}
      </div>

      <label className="form-label mt-3" htmlFor="gx-order-note">Ghi chú cho cả đơn (không bắt buộc)</label>
      <textarea id="gx-order-note" className="form-control" rows={2} maxLength={500}
                placeholder="VD: mang ra cùng lúc" value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="gx-summary">
        <div><span>{count} món</span><strong>{formatMoney(total)}</strong></div>
        <p>Thanh toán tại quầy sau khi dùng xong. Đơn đã gửi chỉ hủy được khi quán chưa bắt đầu pha.</p>
      </div>

      {error && <div className="gx-alert" role="alert"><i className="bi bi-exclamation-circle" />{error}</div>}
      {!table && <div className="gx-alert" role="alert"><i className="bi bi-qr-code-scan" />Quét mã QR trên bàn để gửi đơn.</div>}

      <div className="gx-actions">
        <Link to="/menu" className="btn btn-light-soft">Thêm món</Link>
        <button type="button" className="btn btn-primary flex-grow-1 py-2" disabled={!table || sending} onClick={send}>
          {sending && <span className="spinner-border spinner-border-sm me-2" />}
          Gửi đơn · {formatMoney(total)}
        </button>
      </div>
    </>
  )
}
