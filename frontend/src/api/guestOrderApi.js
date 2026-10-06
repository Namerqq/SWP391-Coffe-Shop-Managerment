import axiosClient from './axiosClient'
import { guestHeaders } from '../utils/guestSession'

// Khách gửi đơn: { items: [...], note, requestKey }
const guestOrderApi = {
  placeOrder: (data) => axiosClient.post('/public/order/orders', data, { headers: guestHeaders() }),
}

export default guestOrderApi
