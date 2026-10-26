import axiosClient from './axiosClient'

// API đặt hàng online (UC-CU05 Place Online Order)
const onlineOrderApi = {
  // Gửi đơn đặt hàng online tới backend: { customerName, customerPhone, deliveryAddress, note, paymentMethod, items }
  placeOrder: (data) => axiosClient.post('/public/online/orders', data),

  // Xem 1 đơn bằng mã đơn (dạng 261023-0008). Không còn tra theo id hay số điện thoại.
  getOrderByCode: (code) => axiosClient.get(`/public/online/orders/code/${encodeURIComponent(code)}`),

  cancelOrder: (code, reason) =>
    axiosClient.post(`/public/online/orders/code/${encodeURIComponent(code)}/cancel`, reason ? { reason } : {}),
}

export default onlineOrderApi
