import axiosClient from './axiosClient'
import { guestHeaders } from '../utils/guestSession'

// Khách tại bàn (không cần đăng nhập): quét QR, xem menu.
const guestTableApi = {
  openTable: (qrCode) => axiosClient.post('/public/order/table', { qrCode }, { headers: guestHeaders() }),
  getContext: () => axiosClient.get('/public/order/context', { headers: guestHeaders() }), // 204 = chưa quét QR
  getMenu: () => axiosClient.get('/public/order/menu'), // { categories, sizes, toppings }
}

export default guestTableApi
