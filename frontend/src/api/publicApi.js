import axiosClient from './axiosClient'

// API công khai cho trang khách (không cần đăng nhập).
const publicApi = {
  getHome: () => axiosClient.get('/public/home'),
  getMenu: () => axiosClient.get('/public/menu'),
}

export default publicApi
