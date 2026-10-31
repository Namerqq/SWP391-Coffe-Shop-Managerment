import axiosClient from './axiosClient'

// API đặt hàng online (UC-CU05 Place Online Order)
const onlineOrderApi = {
  // Gửi đơn đặt hàng online tới backend: { customerName, customerPhone, deliveryAddress, note, paymentMethod, items }
  placeOrder: (data) => axiosClient.post('/public/online/orders', data),

  // Xem 1 đơn bằng mã đơn (dạng 261023-0008). Không còn tra theo id hay số điện thoại.
  getOrderByCode: (code) => axiosClient.get(`/public/online/orders/code/${encodeURIComponent(code)}`),

  // Phí ship cố định (backend giữ số tiền): { shippingFee: 25000 }
  getShippingFee: () => axiosClient.get('/public/online/shipping-fee'),

  cancelOrder: (code, reason) =>
    axiosClient.post(`/public/online/orders/code/${encodeURIComponent(code)}/cancel`, reason ? { reason } : {}),
}

export default onlineOrderApi
