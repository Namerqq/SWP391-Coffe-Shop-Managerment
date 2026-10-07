import axiosClient from './axiosClient'

// Pha chế (UC-B01..B03)
const baristaApi = {
  getBoard: () => axiosClient.get('/barista/orders'),
  getOrder: (id) => axiosClient.get(`/barista/orders/${id}`),
  start: (id) => axiosClient.patch(`/barista/orders/${id}/start`),
  checkItem: (orderId, itemId, done) => axiosClient.patch(`/barista/orders/${orderId}/items/${itemId}`, { done }),
  cancel: (id, reason) => axiosClient.patch(`/barista/orders/${id}/cancel`, { reason }),
  getRecipe: (menuItemId) => axiosClient.get(`/barista/recipes/${menuItemId}`),
}

export default baristaApi
