// Mã đơn online (dạng 261023-0008) trên máy của khách.
// Khách chỉ xem được đơn đang đặt (lưu ở đây); muốn xem đơn khác phải nhập đúng mã đơn.
const CURRENT_KEY = 'online_current_order_code'
const SHOWN_KEY = 'online_code_popup_shown' // các mã đã hiện popup "mã đơn của bạn" (chỉ hiện 1 lần)
const LEGACY_KEYS = ['online_last_order_id', 'online_last_phone'] // cách cũ: tra theo id / SĐT

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // trình duyệt chặn lưu trữ: bỏ qua
  }
}

/** "#261023-0008", " 261023-0008 " -> "261023-0008" */
export const normalizeOrderCode = (value) => String(value || '').replace(/[\s#]/g, '')
export const isValidOrderCode = (code) => /^\d{6}-\d{4,}$/.test(code)

export const getCurrentOrderCode = () => read(CURRENT_KEY, null)

/** Ghi nhớ đơn khách vừa đặt trên máy này, đồng thời xóa dữ liệu tra cứu kiểu cũ (id, SĐT). */
export function setCurrentOrderCode(code) {
  if (!code) return
  write(CURRENT_KEY, normalizeOrderCode(code))
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
  } catch {
    // bỏ qua
  }
}

export const wasCodePopupShown = (code) => read(SHOWN_KEY, []).includes(code)
export function markCodePopupShown(code) {
  const list = read(SHOWN_KEY, []).filter((c) => c !== code)
  write(SHOWN_KEY, [...list, code].slice(-20))
}

/** Sao chép chữ; trình duyệt cũ / không phải https thì dùng cách dự phòng. Trả về true nếu sao chép được. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // thử cách dự phòng bên dưới
  }
  try {
    const box = document.createElement('textarea')
    box.value = text
    box.setAttribute('readonly', '')
    box.style.position = 'fixed'
    box.style.opacity = '0'
    document.body.appendChild(box)
    box.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(box)
    return ok
  } catch {
    return false
  }
}
