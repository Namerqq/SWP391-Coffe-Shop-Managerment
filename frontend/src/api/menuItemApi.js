import axiosClient from './axiosClient'

// UC-DM01 Manage Drink Menu, UC-DM02 Set Item Availability
const menuItemApi = {
  // includeInactive = true: hiện cả món đã xóa (availability_status = INACTIVE)
  search: ({ keyword, categoryId, includeInactive } = {}) =>
    axiosClient.get('/menu-items', {
      params: { keyword: keyword || undefined, categoryId: categoryId || undefined, includeInactive },
    }),
  getById: (id) => axiosClient.get(`/menu-items/${id}`),
  create: (data) => axiosClient.post('/menu-items', data),
  update: (id, data) => axiosClient.put(`/menu-items/${id}`, data),
  changeAvailability: (id, availabilityStatus) =>
    axiosClient.patch(`/menu-items/${id}/availability`, { availabilityStatus }),
  remove: (id) => axiosClient.delete(`/menu-items/${id}`),
  restore: (id) => axiosClient.patch(`/menu-items/${id}/restore`),
}

export default menuItemApi
