export const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  CASHIER: 'Thu ngân',
  WAITER: 'Phục vụ',
  BARISTA: 'Pha chế',
}

export const ROLE_DESCRIPTIONS = {
  ADMIN: 'Quản lý tài khoản nhân viên, phân quyền và cấu hình hệ thống.',
  MANAGER: 'Quản lý menu, bàn, kho và xem báo cáo doanh thu.',
  CASHIER: 'Nhận đơn, tính tiền và xác nhận thanh toán.',
  WAITER: 'Phục vụ bàn, tạo đơn và giao món.',
  BARISTA: 'Pha chế đồ uống, xem công thức và ghi xuất kho.',
}

export const STATUS_LABELS = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Đã vô hiệu hóa',
  LOCKED: 'Bị khóa',
}

export const roleLabel = (name) => ROLE_LABELS[name] || name

export function initials(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const last = parts[parts.length - 1][0]
  return (parts.length > 1 ? parts[0][0] + last : last).toUpperCase()
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
