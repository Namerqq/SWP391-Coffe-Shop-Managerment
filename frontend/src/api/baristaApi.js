import axiosClient from './axiosClient'

// Pha chế (UC-B01..B03): pha theo từng món, tích xong món nào thì món đó sang "Chờ mang ra".
const baristaApi = {
  getBoard: () => axiosClient.get('/barista/orders'),
  getOrder: (id) => axiosClient.get(`/barista/orders/${id}`),
  checkItem: (orderId, itemId, done) => axiosClient.patch(`/barista/orders/${orderId}/items/${itemId}`, { done }),
  checkItems: (itemIds) => axiosClient.patch('/barista/items/done', { itemIds }), // trả về bảng pha chế mới
  cancelItem: (orderId, itemId) => axiosClient.patch(`/barista/orders/${orderId}/items/${itemId}/cancel`),
  getRecipe: (menuItemId) => axiosClient.get(`/barista/recipes/${menuItemId}`),
}

export default baristaApi
