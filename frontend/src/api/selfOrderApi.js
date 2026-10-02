import axiosClient from './axiosClient'

// API công khai cho khách quét QR: UC-CU01, UC-CU02, UC-CU03
const selfOrderApi = {
  getTable: (qrCode) => axiosClient.get(`/public/tables/${encodeURIComponent(qrCode)}`),
  getMenu: () => axiosClient.get('/public/menu'),
  placeOrder: (data) => axiosClient.post('/public/orders', data),
}

export default selfOrderApi
