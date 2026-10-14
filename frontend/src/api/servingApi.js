import axiosClient from './axiosClient'

// Theo dõi đơn tại bàn + mang món ra (Phục vụ) / Mang đi chờ giao (Thu ngân) - UC-W08
const servingApi = {
  getBoard: () => axiosClient.get('/serving/board'), // Phục vụ: đơn tại bàn còn món chờ pha / chờ mang ra
  serveItem: (orderId, itemId) => axiosClient.patch(`/serving/orders/${orderId}/items/${itemId}/served`),
  getReady: (type) => axiosClient.get('/serving/ready', { params: { type } }), // type: DINE_IN | PICKUP
  markServed: (orderId) => axiosClient.patch(`/serving/orders/${orderId}/served`),
}

export default servingApi
