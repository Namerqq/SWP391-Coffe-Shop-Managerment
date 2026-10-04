import axiosClient from './axiosClient'
import { guestHeaders } from '../utils/guestSession'

// Khách xem / hủy đơn của mình.
const guestTrackingApi = {
  getMyOrders: () => axiosClient.get('/public/order/orders', { headers: guestHeaders() }),
  cancel: (orderId, reason) => axiosClient.post(`/public/order/orders/${orderId}/cancel`, { reason }, { headers: guestHeaders() }),
}

export default guestTrackingApi
