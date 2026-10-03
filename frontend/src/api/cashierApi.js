import axiosClient from './axiosClient'

// Thu ngân. Sơ đồ bàn / chi tiết bàn / menu dùng staffApi (API chung).
const cashierApi = {
  findCustomer: (phone) => axiosClient.get('/cashier/customers', { params: { phone } }), // 404 = chưa có
  createCustomer: (data) => axiosClient.post('/cashier/customers', data),
}

export default cashierApi
