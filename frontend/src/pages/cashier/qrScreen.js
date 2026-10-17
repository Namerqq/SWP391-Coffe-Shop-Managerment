// Tiện ích dùng chung cho thanh toán QR payOS (ThangNN).
// Nhớ mã QR nào đang hiện trên màn hình / đã được báo, để thông báo chung (QrPaymentNotifier) không báo trùng
// với hộp QR đang mở.
const onScreen = new Map()
const announced = new Set()

export function showingQr(id) {
  onScreen.set(id, (onScreen.get(id) || 0) + 1)
}

export function hidingQr(id) {
  const n = (onScreen.get(id) || 1) - 1
  if (n <= 0) onScreen.delete(id)
  else onScreen.set(id, n)
}

export function markQrAnnounced(id) {
  announced.add(id)
}

/** Mã chưa hiện trên màn hình nào và chưa được báo -> thông báo chung mới báo. */
export const shouldAnnounce = (id) => !onScreen.has(id) && !announced.has(id)

/** "261012-0007" -> "#0007" */
export const shortNo = (orderNumber) => (orderNumber ? `#${orderNumber.split('-').pop()}` : '')

/** Nơi của mã QR: "Bàn 05" / "Mang đi #0007" / "Mang đi". */
export const qrPlace = (qr) => {
  if (qr.target === 'TABLE') return qr.tableNumber || 'Bàn'
  if (qr.target === 'ONLINE') return qr.takeawayOrderNumber ? `Đơn online ${shortNo(qr.takeawayOrderNumber)}` : 'Đơn online'
  return qr.takeawayOrderNumber ? `Mang đi ${shortNo(qr.takeawayOrderNumber)}` : 'Mang đi'
}

/** 754 -> "12:34" */
export const mmss = (seconds) => {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Mã QR đã thanh toán -> cùng dạng kết quả thu tiền (PaymentResult) để các trang dùng lại hàm paid(). */
export const toPaymentResult = (qr) => ({
  paymentId: qr.paymentId,
  paymentCode: qr.paymentCode,
  amount: qr.amount,
  orderId: null,
  orderNumber: qr.takeawayOrderNumber,
  tableReleased: qr.tableReleased,
})
