import axiosClient from './axiosClient'

// Quản lý: biên bản sự cố đổ / vỡ món của phục vụ, quyết định mức phạt.
const incidentApi = {
  getAll: (status) => axiosClient.get('/manager/incidents', { params: { status } }), // status: PENDING | REVIEWED | bỏ trống = tất cả
  review: (id, data) => axiosClient.patch(`/manager/incidents/${id}/review`, data), // data = { penaltyAmount, managerNote }
}

export default incidentApi
