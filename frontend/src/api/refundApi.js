import axiosClient from './axiosClient'

// Quản lý hậu kiểm hoàn tiền (ThangNN Iter3): chỉ xem. params: { from, to } dạng yyyy-mm-dd, bỏ trống = 7 ngày gần nhất.
const refundApi = {
  getReport: (params) => axiosClient.get('/manager/refunds', { params }),
}

export default refundApi
