import client from './axiosClient'
const base = '/manager/menu'
export default {
  catalog: () => client.get(base),
  saveItem: (id, data) => id ? client.put(`${base}/items/${id}`, data) : client.post(`${base}/items`, data),
  deleteItem: id => client.delete(`${base}/items/${id}`),
  availability: (id, available) => client.patch(`${base}/items/${id}/availability`, { available }),
  saveCategory: (id, data) => id ? client.put(`${base}/categories/${id}`, data) : client.post(`${base}/categories`, data),
  deleteCategory: id => client.delete(`${base}/categories/${id}`),
  upload: file => { const data = new FormData(); data.append('file', file); return client.post(`${base}/images`, data, { headers: { 'Content-Type': 'multipart/form-data' } }) },
}
