import axiosClient from './axiosClient'

/** API kho nguyên liệu — Manager. */
const inventoryApi = {
  // Manager endpoints
  list:     ()           => axiosClient.get('/manager/inventory'),
  lowStock: ()           => axiosClient.get('/manager/inventory/low-stock'),
  stats:    ()           => axiosClient.get('/manager/inventory/stats'),
  get:      (id)         => axiosClient.get(`/manager/inventory/${id}`),
  create:   (data)       => axiosClient.post('/manager/inventory', data),
  update:   (id, data)   => axiosClient.put(`/manager/inventory/${id}`, data),
  stockIn:  (id, data)   => axiosClient.post(`/manager/inventory/${id}/stock-in`, data),
  stockOut: (id, data)   => axiosClient.post(`/manager/inventory/${id}/stock-out`, data),
  history:  (id, date)   => axiosClient.get(`/manager/inventory/${id}/history`, { params: date ? { date } : {} }),
  transactions: (params) => axiosClient.get('/manager/inventory/transactions', { params }),
  receiptHistory: (ingredientId, date) =>
    axiosClient.get('/manager/inventory/receipt-history', { params: { ingredientId, date } }),

  // Barista endpoints (read-only)
  baristaList:     () => axiosClient.get('/barista/inventory'),
  baristaLowStock: () => axiosClient.get('/barista/inventory/low-stock'),
}

export default inventoryApi
