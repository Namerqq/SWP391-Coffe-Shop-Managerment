import axiosClient from './axiosClient'

// ThangDT Iter 3: phục vụ đi giao đơn online (chỉ đơn được gán cho mình).
const waiterDeliveryApi = {
  getMyDeliveries: () => axiosClient.get('/waiter/deliveries'),
  pickUp: (orderId) => axiosClient.put(`/waiter/deliveries/${orderId}/pick-up`),
  deliver: (orderId) => axiosClient.put(`/waiter/deliveries/${orderId}/deliver`),
  fail: (orderId, reason) => axiosClient.put(`/waiter/deliveries/${orderId}/fail`, { reason }),
}

export default waiterDeliveryApi
