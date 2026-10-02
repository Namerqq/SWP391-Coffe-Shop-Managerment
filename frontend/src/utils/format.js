// 35000 -> "35.000đ" (tiền lưu BIGINT theo VND)
export const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

// Lấy thông báo lỗi từ response của backend (GlobalExceptionHandler)
// - Lỗi nghiệp vụ / 404: { message: "..." }
// - Lỗi validate:       { field: "message", ... }
export const getErrorMessage = (err, fallback = 'Có lỗi xảy ra, vui lòng thử lại') => {
  if (!err?.response) return 'Không kết nối được server. Backend đã chạy chưa?'
  const data = err.response.data
  if (data?.message) return data.message
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

// Chữ cái đầu để làm thumbnail khi món chưa có ảnh
export const initial = (name = '') => name.trim().charAt(0).toUpperCase() || '?'
