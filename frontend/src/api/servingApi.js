import axiosClient from './axiosClient'

// Món chờ mang ra (Phục vụ) / Mang đi chờ giao (Thu ngân) - UC-W08
const servingApi = {
  getReady: (type) => axiosClient.get('/serving/ready', { params: { type } }), // type: DINE_IN | PICKUP
  markServed: (orderId) => axiosClient.patch(`/serving/orders/${orderId}/served`),
}

export default servingApi
