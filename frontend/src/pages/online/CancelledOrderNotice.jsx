import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import onlineOrderApi from '../../api/onlineOrderApi'
import usePolling from '../../utils/usePolling'
import { getCurrentOrderCode } from '../../utils/onlineOrderCode'

const SEEN_KEY = 'online_cancel_seen' // các mã đơn bị hủy mà khách đã bấm "Đã hiểu"

const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) || []
  } catch {
    return []
  }
}
const markSeen = (code) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...readSeen().filter((c) => c !== code), code].slice(-20)))
  } catch {
    // trình duyệt chặn lưu trữ: bỏ qua
  }
}

/**
 * Báo khách khi đơn vừa đặt bị hủy (hết món, giao không thành công...), ở mọi trang đặt hàng online,
 * không cần vào trang Đơn của tôi. Kiểm tra đơn đang đặt trên máy này mỗi 20 giây.
 * Hiện cho tới khi khách bấm "Đã hiểu" hoặc mở trang Đơn của tôi (trang đó đã ghi rõ lý do hủy).
 */
export default function CancelledOrderNotice() {
  const location = useLocation()
  const [order, setOrder] = useState(null)
  const [doneCode, setDoneCode] = useState(null) // mã đơn đã giao xong: thôi hỏi server

  const onTrackingPage = location.pathname.startsWith('/online-order/orders')

  const check = async () => {
    const code = getCurrentOrderCode()
    if (order && order.orderNumber !== code) setOrder(null) // khách đã đặt đơn mới
    if (!code || code === doneCode || readSeen().includes(code)) return
    try {
      const res = await onlineOrderApi.getOrderByCode(code)
      const o = res.data
      if (o.status === 'CANCELLED') setOrder(o)
      else if (o.status === 'COMPLETED') setDoneCode(code)
    } catch {
      // mất mạng / không tìm thấy: lần sau thử lại
    }
  }

  usePolling(check, 20000)

  if (!order || readSeen().includes(order.orderNumber)) return null
  if (onTrackingPage) {
    markSeen(order.orderNumber) // khách đã thấy lý do hủy trên trang Đơn của tôi
    return null
  }

  const dismiss = () => {
    markSeen(order.orderNumber)
    setOrder(null)
  }
  const failed = order.deliveryStatus === 'FAILED'
  const paidByQr = order.paymentMethod === 'PAYOS_QR'

  return (
    <div className="alert alert-danger d-flex gap-2 align-items-start mb-3" role="alert">
      <i className="bi bi-exclamation-octagon-fill fs-5" aria-hidden="true" />
      <div className="flex-grow-1 small">
        <strong>
          Đơn #{order.orderNumber} {failed ? 'giao không thành công, đơn đã hủy.' : 'đã bị hủy.'}
        </strong>
        {(order.failureReason || order.cancelReason) && (
          <div>Lý do: {failed ? order.failureReason || order.cancelReason : order.cancelReason}</div>
        )}
        {paidByQr && <div>Bạn đã thanh toán QR, quán sẽ hoàn tiền cho bạn qua chuyển khoản.</div>}
        <div className="mt-2 d-flex gap-2">
          <Link to={`/online-order/orders?code=${order.orderNumber}`} className="btn btn-sm btn-outline-danger">
            Xem đơn
          </Link>
          <button type="button" className="btn btn-sm btn-danger" onClick={dismiss}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}
