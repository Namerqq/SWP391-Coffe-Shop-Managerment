import axiosClient from './axiosClient'

// ThangNN Iter2: thanh toán QR + tích điểm + hóa đơn điện tử cho khách đặt online (API công khai, không cần đăng nhập).
const onlinePaymentApi = {
  // Tra điểm theo SĐT nhận hàng: { member, phoneNumber, fullName, points, pointValueVnd, vndPerPoint }
  lookupLoyalty: (phone) => axiosClient.get('/public/online/loyalty', { params: { phone } }),
  // Tạo mã QR: { customerName, customerPhone, deliveryAddress, note, items, joinLoyalty, pointsToRedeem }
  createQr: (data) => axiosClient.post('/public/online/qr-payments', data),
  // Trạng thái mã theo paymentLinkId (trang QR hỏi mỗi 3 giây)
  getQr: (paymentLinkId) => axiosClient.get(`/public/online/qr-payments/${encodeURIComponent(paymentLinkId)}`),
  // Hóa đơn điện tử: 20 đơn online đã thanh toán gần nhất của SĐT
  receipts: (phone) => axiosClient.get('/public/online/receipts', { params: { phone } }),
}

export default onlinePaymentApi
