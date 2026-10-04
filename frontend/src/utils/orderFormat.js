import { DEFAULT_LEVEL } from './orderOptions'

// Định dạng dùng chung cho các màn hình đơn hàng (Barista, Waiter, Cashier).

/** Trạng thái đơn trong DB (schema V1) -> tên hiển thị theo SRS. */
export const ORDER_STATUS = {
  PENDING_CONFIRMATION: { label: 'Chờ pha', tone: 'pending' },
  CONFIRMED: { label: 'Chờ pha', tone: 'pending' },
  PREPARING: { label: 'Đang pha', tone: 'preparing' },
  READY: { label: 'Chờ mang ra', tone: 'ready' },
  COMPLETED: { label: 'Đã phục vụ', tone: 'served' },
  CANCELLED: { label: 'Đã hủy', tone: 'cancelled' },
  REJECTED: { label: 'Bị từ chối', tone: 'cancelled' },
}

export const orderStatusLabel = (s) => ORDER_STATUS[s]?.label || s
export const orderStatusTone = (s) => ORDER_STATUS[s]?.tone || 'served'
/** Đơn còn chờ pha (được sửa / hủy). */
export const isWaiting = (s) => s === 'PENDING_CONFIRMATION' || s === 'CONFIRMED'

export function formatMoney(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')}đ`
}

/** "Size M, 50% đường, 30% đá, + Trân châu" — chỉ hiện lựa chọn khác mặc định. */
export function itemOptionsText(item) {
  const parts = []
  if (item.sizeName) parts.push(`Size ${item.sizeName}`)
  if (item.sugarLevel && item.sugarLevel !== DEFAULT_LEVEL) parts.push(`${item.sugarLevel} đường`)
  if (item.iceLevel && item.iceLevel !== DEFAULT_LEVEL) parts.push(`${item.iceLevel} đá`)
  if (item.toppings?.length) parts.push(`+ ${item.toppings.map((t) => t.name).join(', ')}`)
  return parts.join(', ')
}

export function minutesSince(value) {
  if (!value) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
}

/** "mới" / "7 phút" / "1 giờ 5 phút" */
export function elapsedLabel(value) {
  const m = minutesSince(value)
  if (m < 1) return 'mới'
  if (m < 60) return `${m} phút`
  return `${Math.floor(m / 60)} giờ ${m % 60} phút`
}

export function formatTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** Nơi nhận đơn: "Bàn 01" / "Mang đi" / "Giao hàng". */
export const placeLabel = (o) =>
  o.tableNumber || (o.fulfillmentType === 'DELIVERY' ? 'Giao hàng' : 'Mang đi')
