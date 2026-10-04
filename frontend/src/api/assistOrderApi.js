import axiosClient from './axiosClient'

// Phục vụ gọi món giúp khách: { tableId, items: [...], note }
const assistOrderApi = {
  create: (data) => axiosClient.post('/waiter/assist-orders', data),
}

export default assistOrderApi
