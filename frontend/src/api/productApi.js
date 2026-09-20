import axiosClient from './axiosClient'

// Mỗi hàm = 1 endpoint của backend. Page/Component chỉ gọi hàm này, KHÔNG tự viết URL.
const productApi = {
  getAll: (keyword) => axiosClient.get('/products', { params: { keyword } }),
  getById: (id) => axiosClient.get(`/products/${id}`),
  create: (data) => axiosClient.post('/products', data),
  update: (id, data) => axiosClient.put(`/products/${id}`, data),
  remove: (id) => axiosClient.delete(`/products/${id}`),
}

export default productApi
