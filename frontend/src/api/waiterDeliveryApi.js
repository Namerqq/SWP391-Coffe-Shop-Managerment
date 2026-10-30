import axiosClient from './axiosClient'

// ThangDT Iter 3: phục vụ đi giao đơn online (chỉ đơn được gán cho mình).
const waiterDeliveryApi = {
  getMyDeliveries: () => axiosClient.get('/waiter/deliveries'),
  pickUp: (orderId) => axiosClient.put(`/waiter/deliveries/${orderId}/pick-up`),
  deliver: (orderId) => axiosClient.put(`/waiter/deliveries/${orderId}/deliver`),
}

export default waiterDeliveryApi
