import axiosClient from './axiosClient'

// ThangDT Iter 3: phục vụ đi giao đơn online (chỉ đơn được gán cho mình).
const waiterDeliveryApi = {
  getMyDeliveries: () => axiosClient.get('/waiter/deliveries'),
  pickUp: (orderId) => axiosClient.put(`/waiter/deliveries/${orderId}/pick-up`),
  // Đã giao: gửi kèm ảnh món lúc giao (bắt buộc).
  deliver: (orderId, photo) => {
    const data = new FormData()
    data.append('photo', photo)
    return axiosClient.put(`/waiter/deliveries/${orderId}/deliver`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  fail: (orderId, reason) => axiosClient.put(`/waiter/deliveries/${orderId}/fail`, { reason }),
}

export default waiterDeliveryApi
