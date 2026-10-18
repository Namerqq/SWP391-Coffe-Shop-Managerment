import axiosClient from './axiosClient'

// API đặt hàng online (UC-CU05 Place Online Order)
const onlineOrderApi = {
  // Gửi đơn đặt hàng online tới backend: { customerName, customerPhone, deliveryAddress, note, paymentMethod, items }
  placeOrder: (data) => axiosClient.post('/public/online/orders', data),

  getOrderById: (id) => axiosClient.get(`/public/online/orders/${id}`),

  getOrdersByPhone: (phone) => axiosClient.get(`/public/online/orders/by-phone?phone=${encodeURIComponent(phone)}`),

  cancelOrder: (id, reason) =>
    axiosClient.post(`/public/online/orders/${id}/cancel`, reason ? { reason } : {}),
}

export default onlineOrderApi
