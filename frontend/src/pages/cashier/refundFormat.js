// Nhãn dùng chung cho phần Hoàn tiền (ThangNN Iter3): popup Hoàn tiền ở Lịch sử đơn, hóa đơn, màn hậu kiểm của Quản lý.

export const REFUND_STATUS = {
  REFUND_PENDING: { label: 'Chờ chuyển khoản', tone: 'pending' },
  REFUNDED: { label: 'Đã hoàn', tone: 'served' },
}

export const REFUND_METHOD = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' }

export const refundStatus = (r) => REFUND_STATUS[r.status] || { label: r.status, tone: 'served' }

/** Đơn tại quầy (tại bàn / mang đi) đã thanh toán, chưa hủy, còn món chưa mang ra -> hoàn tiền được. */
export const canRefundCounterOrder = (o) =>
  o.paymentStatus === 'PAID' && o.fulfillmentType !== 'DELIVERY'
  && o.status !== 'CANCELLED' && o.status !== 'REJECTED'
  && o.items.some((i) => i.status !== 'CANCELLED' && i.status !== 'SERVED')

/** Đơn online đã trả QR, phục vụ chưa lấy hàng đi giao -> thu ngân hủy và hoàn tiền được. */
export const canCancelPaidDelivery = (o) =>
  o.paymentStatus === 'PAID' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
  && ['PENDING_ASSIGNMENT', 'ASSIGNED'].includes(o.deliveryStatus)

/** Ngày hôm nay theo giờ máy, dạng yyyy-mm-dd (giá trị của ô chọn ngày). */
export function todayString() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
