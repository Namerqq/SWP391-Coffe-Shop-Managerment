import axiosClient from './axiosClient'

// Các API chỉ ADMIN dùng được.
const adminApi = {
  getRoles: () => axiosClient.get('/admin/roles'),

  // UC-AD01..AD05
  getUsers: (params) => axiosClient.get('/admin/users', { params }),
  getUser: (id) => axiosClient.get(`/admin/users/${id}`),
  createUser: (data) => axiosClient.post('/admin/users', data),
  updateUser: (id, data) => axiosClient.put(`/admin/users/${id}`, data),
  assignRole: (id, roleId) => axiosClient.patch(`/admin/users/${id}/role`, { roleId }),
  updateStatus: (id, status) => axiosClient.patch(`/admin/users/${id}/status`, { status }),
  deleteUser: (id) => axiosClient.delete(`/admin/users/${id}`),

  // UC-AD06
  getSettings: () => axiosClient.get('/admin/settings'),
  updateSettings: (values) => axiosClient.put('/admin/settings', values),

  // Upload ảnh (ảnh trang chủ...). Trả về { url: '/uploads/home/xxx.jpg' }
  uploadImage: (file, folder = 'home') => {
    const form = new FormData()
    form.append('file', file)
    form.append('folder', folder)
    return axiosClient.post('/admin/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export default adminApi
