// Trạng thái TỪNG MÓN (order_items.item_status). Pha chế và phục vụ làm theo từng món:
//   PENDING / PREPARING = Chờ pha  ->  READY = Chờ mang ra  ->  SERVED = Đã mang ra   (CANCELLED = Đã hủy)
// PREPARING chỉ còn ở đơn cũ (trước khi bỏ bước "Bắt đầu pha"), coi như Chờ pha.

export const isItemWaiting = (i) => i.status === 'PENDING' || i.status === 'PREPARING'
export const isItemReady = (i) => i.status === 'READY'
export const isItemDone = (i) => i.status === 'READY' || i.status === 'SERVED'
export const isItemCancelled = (i) => i.status === 'CANCELLED'

export const ITEM_STATUS_LABEL = {
  PENDING: 'Chờ pha',
  PREPARING: 'Chờ pha',
  READY: 'Chờ mang ra',
  SERVED: 'Đã mang ra',
  CANCELLED: 'Đã hủy',
}

/** Trạng thái đơn còn hiện trên bảng Pha chế / Phục vụ. */
export const ON_BOARD = ['PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY']
