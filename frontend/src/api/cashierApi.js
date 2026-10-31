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
  // Iter3: bỏ 1 món chưa phục vụ của đơn tại bàn chưa thanh toán. data: { reason, expectedStatus }
  cancelOrderItem: (orderId, itemId, data) => axiosClient.post(`/cashier/orders/${orderId}/items/${itemId}/cancel`, data),
  // UC-C15 Lịch sử đơn: mọi đơn trong ngày (yyyy-mm-dd, bỏ trống = hôm nay) + tiền đã thu trong ngày
  getHistory: (date) => axiosClient.get('/cashier/history', { params: date ? { date } : {} }),

  // Iter3 Khách thân thiết (UC-C12). params: { keyword, sort: 'recent' | 'points' | 'name', page (từ 0), size }
  getLoyaltyCustomers: (params) => axiosClient.get('/cashier/loyalty-customers', { params }),
  getLoyaltyHistory: (id) => axiosClient.get(`/cashier/loyalty-customers/${id}/history`),
  // Chỉ sửa tên: data = { fullName }. Số điện thoại không sửa được.
  updateCustomer: (id, data) => axiosClient.put(`/cashier/loyalty-customers/${id}`, data),

  // QR payOS tự xác nhận. data giống paySession / takeaway nhưng không có method.
  createSessionQr: (sessionId, data) => axiosClient.post(`/cashier/qr-payments/sessions/${sessionId}`, data),
  createTakeawayQr: (data) => axiosClient.post('/cashier/qr-payments/takeaway', data),
  getQr: (id) => axiosClient.get(`/cashier/qr-payments/${id}`),
  cancelQr: (id) => axiosClient.post(`/cashier/qr-payments/${id}/cancel`),
  renewQr: (id) => axiosClient.post(`/cashier/qr-payments/${id}/renew`), // mã hết hạn / đã hủy -> tạo mã mới
  // params: { sessionId } (mã của 1 bàn) | { target: 'TAKEAWAY' } | bỏ trống = mọi mã đang chờ
  getPendingQrs: (params) => axiosClient.get('/cashier/qr-payments/pending', { params }),
  // since = serverTime của lần hỏi trước -> các mã vừa thanh toán xong (PAID) / cần kiểm tra tay (MISMATCH)
  getQrEvents: (since) => axiosClient.get('/cashier/qr-payments/events', { params: since ? { since } : {} }),

  // Lấy danh sách đơn giao hàng online cho thu ngân (Ship Order List)
  // params (không bắt buộc): { from, to } = thời gian đặt đơn dạng 2026-10-26T08:00, { code } = mã đơn (1 phần cũng được)
  getDeliveryOrders: (params) => axiosClient.get('/cashier/delivery-orders', { params }),
  // Thu ngân xác nhận đơn giao hàng
  confirmDeliveryOrder: (id) => axiosClient.post(`/cashier/delivery-orders/${id}/confirm`),
  // Thu ngân hủy đơn (ví dụ hết nguyên liệu)
  cancelDeliveryOrder: (id, reason) => axiosClient.post(`/cashier/delivery-orders/${id}/cancel`, reason ? { reason } : {}),
}

export default cashierApi
