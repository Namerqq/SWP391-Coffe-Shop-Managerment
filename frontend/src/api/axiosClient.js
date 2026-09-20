import axios from 'axios'

// Cấu hình axios DÙNG CHUNG: địa chỉ backend nằm ở 1 chỗ duy nhất.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
})

export default axiosClient
