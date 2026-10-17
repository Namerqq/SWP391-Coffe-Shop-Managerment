import axiosClient from './axiosClient'

// API đặt hàng online (UC-CU05 Place Online Order)
const onlineOrderApi = {
  // Gửi đơn đặt hàng online tới backend: { customerName, customerPhone, deliveryAddress, note, paymentMethod, items }
  placeOrder: (data) => axiosClient.post('/public/online/orders', data),
}

export default onlineOrderApi
