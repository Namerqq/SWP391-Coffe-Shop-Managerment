import axiosClient from './axiosClient'

// Phục vụ: sửa / bỏ món, hủy đơn còn chờ pha (UC-W05..W07).
// Sơ đồ bàn + chi tiết bàn dùng staffApi (API chung).
const waiterApi = {
  updateItem: (orderId, itemId, data) => axiosClient.put(`/waiter/orders/${orderId}/items/${itemId}`, data),
  removeItem: (orderId, itemId) => axiosClient.delete(`/waiter/orders/${orderId}/items/${itemId}`),
  cancelOrder: (orderId, reason) => axiosClient.patch(`/waiter/orders/${orderId}/cancel`, { reason }),
  changeTable: (currentTableId, targetTableId) =>
    axiosClient.put(`/waiter/tables/${currentTableId}/change-table`, { targetTableId }),
  // Chuông thông báo: món bị pha chế hủy vì hết nguyên liệu
  getNotifications: () => axiosClient.get('/waiter/notifications'),
}

export default waiterApi
