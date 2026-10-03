const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const SERVER = API_URL.replace(/\/api\/?$/, '')

/** Ảnh upload lưu ở backend (/uploads/...) -> ghép địa chỉ server. Link http(s) giữ nguyên. */
export function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  if (path.startsWith('/uploads/')) return SERVER + path
  return path
}
