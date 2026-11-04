import axios from 'axios'
import { getToken } from '../utils/authStorage'

// Cấu hình axios DÙNG CHUNG: địa chỉ backend nằm ở 1 chỗ duy nhất.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
})

// Mỗi GET của khách có URL riêng để không dùng lại bản 410 đã cache trước khi backend có no-store.
// Không đưa token vào URL; mã này chỉ phân biệt request, không dùng để xác thực.
let guestRequestSequence = 0

// Tự gắn token đăng nhập vào mọi request.
axiosClient.interceptors.request.use((config) => {
  if (config.method?.toLowerCase() === 'get' && /^\/public\/order(?:\/|$)/.test(config.url || '')) {
    const params = new URLSearchParams(config.params)
    params.set('_guestRequest', `${Date.now()}-${++guestRequestSequence}`)
    config.params = params
  }
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Hết phiên (401) -> báo cho AuthContext đăng xuất.
axiosClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(error)
  }
)

/** Lấy câu thông báo lỗi từ backend ({ message }) để hiện cho người dùng. */
export function errorMessage(error, fallback = 'Có lỗi xảy ra, vui lòng thử lại.') {
  if (!error.response) return 'Không kết nối được máy chủ. Backend đã chạy chưa?'
  return error.response.data?.message || fallback
}

export default axiosClient
