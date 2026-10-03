import axiosClient from './axiosClient'

const authApi = {
  login: (identifier, password) => axiosClient.post('/auth/login', { identifier, password }),
  logout: () => axiosClient.post('/auth/logout'),
  me: () => axiosClient.get('/auth/me'),
}

export default authApi
