import axiosClient from './axiosClient'

// Thu ngân. Sơ đồ bàn / chi tiết bàn / menu dùng staffApi (API chung).
const cashierApi = {
  findCustomer: (phone) => axiosClient.get('/cashier/customers', { params: { phone } }), // 404 = chưa có
  createCustomer: (data) => axiosClient.post('/cashier/customers', data),
  getPaymentSettings: () => axiosClient.get('/cashier/payment-settings'),
  // data: { method, customerId, pointsToRedeem, orderIds, expectedSubtotal }. orderIds bỏ trống = thu mọi đơn chưa thanh toán.
  paySession: (sessionId, data) => axiosClient.post(`/cashier/sessions/${sessionId}/pay`, data),
  takeaway: (data) => axiosClient.post('/cashier/takeaway', data),
  getReceipt: (paymentId) => axiosClient.get(`/cashier/payments/${paymentId}/receipt`),
}

export default cashierApi
