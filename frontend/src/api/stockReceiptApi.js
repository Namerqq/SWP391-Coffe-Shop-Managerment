import axiosClient from './axiosClient'

/** API Quản lý phiếu nhập kho & yêu cầu bổ sung nguyên liệu — Manager. */
const stockReceiptApi = {
  list: (params) => axiosClient.get('/manager/stock-receipts', { params }),
  get: (id) => axiosClient.get(`/manager/stock-receipts/${id}`),
  createDraft: (data) => axiosClient.post('/manager/stock-receipts', data),
  updateDraft: (id, data) => axiosClient.put(`/manager/stock-receipts/${id}`, data),
  confirm: (id) => axiosClient.post(`/manager/stock-receipts/${id}/confirm`),
  cancel: (id, data) => axiosClient.post(`/manager/stock-receipts/${id}/cancel`, data),
}

export default stockReceiptApi
