import axiosClient from './axiosClient'

// Pha chế (UC-B01..B06): pha theo từng món (tích món đầu tiên thì tự động trừ kho), báo thiếu, báo hao hụt.
const baristaApi = {
  getBoard: () => axiosClient.get('/barista/orders'),
  getOrder: (id) => axiosClient.get(`/barista/orders/${id}`),
  checkItem: (orderId, itemId, done) => axiosClient.patch(`/barista/orders/${orderId}/items/${itemId}`, { done }),
  checkItems: (itemIds) => axiosClient.patch('/barista/items/done', { itemIds }), // trả về bảng pha chế mới
  cancelItem: (orderId, itemId) => axiosClient.patch(`/barista/orders/${orderId}/items/${itemId}/cancel`),
  getRecipe: (menuItemId) => axiosClient.get(`/barista/recipes/${menuItemId}`),
  reportShortage: (data) => axiosClient.post('/barista/inventory/report-shortage', data),
  reportWaste: (id, data) => axiosClient.post(`/barista/inventory/${id}/waste`, data),
}

export default baristaApi
