import axiosClient from './axiosClient'

// API dùng chung cho Thu ngân + Phục vụ.
const staffApi = {
  getMenu: () => axiosClient.get('/staff/menu'), // { categories, sizes, toppings }
  getTables: () => axiosClient.get('/staff/tables'), // sơ đồ bàn
  getTableSession: (tableId) => axiosClient.get(`/staff/tables/${tableId}/session`), // lượt khách + đơn của bàn
}

export default staffApi
