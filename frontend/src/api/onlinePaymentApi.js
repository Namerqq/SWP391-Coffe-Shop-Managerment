import axiosClient from './axiosClient'

// ThangNN Iter2: thanh toán QR + hóa đơn điện tử cho khách đặt online (API công khai, không cần đăng nhập).
// Khách online không tích điểm và không dùng điểm.
const onlinePaymentApi = {
  // Tạo mã QR: { customerName, customerPhone, deliveryAddress, note, items }
  createQr: (data) => axiosClient.post('/public/online/qr-payments', data),
  // Trạng thái mã theo paymentLinkId (trang QR hỏi mỗi 3 giây)
  getQr: (paymentLinkId) => axiosClient.get(`/public/online/qr-payments/${encodeURIComponent(paymentLinkId)}`),
  // Hóa đơn điện tử của 1 đơn đã thanh toán, tra bằng mã đơn (dạng 261023-0008)
  receipt: (code) => axiosClient.get(`/public/online/receipts/${encodeURIComponent(code)}`),
}

export default onlinePaymentApi
