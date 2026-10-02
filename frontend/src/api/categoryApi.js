import axiosClient from './axiosClient'

// UC-CG01 Manage Category
const categoryApi = {
  getAll: () => axiosClient.get('/categories'),
  getById: (id) => axiosClient.get(`/categories/${id}`),
  create: (data) => axiosClient.post('/categories', data),
  update: (id, data) => axiosClient.put(`/categories/${id}`, data),
  changeStatus: (id, status) => axiosClient.patch(`/categories/${id}/status`, { status }),
  remove: (id) => axiosClient.delete(`/categories/${id}`),
}

export default categoryApi
