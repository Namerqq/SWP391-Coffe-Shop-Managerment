// Lưu trên máy khách: mã phiên gọi món (cấp khi quét QR) và giỏ hàng theo từng bàn.
const TOKEN_KEY = 'gc_guest_token'
const cartKey = (tableId) => `gc_guest_cart_${tableId}`

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
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // trình duyệt chặn lưu trữ: giỏ hàng chỉ còn trong phiên đang mở
  }
}

export const getGuestToken = () => read(TOKEN_KEY, null)
export const setGuestToken = (token) => write(TOKEN_KEY, token)
export const guestHeaders = () => {
  const token = getGuestToken()
  return token ? { 'X-Guest-Token': token } : {}
}

export const loadCart = (tableId) => (tableId ? read(cartKey(tableId), []) : [])
export const saveCart = (tableId, cart) => tableId && write(cartKey(tableId), cart.length ? cart : null)

/** Mã yêu cầu chống gửi trùng đơn (giữ nguyên khi gửi lại sau lỗi mạng). */
export const newRequestKey = () =>
  (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9-]/g, '')

/** Cùng món + cùng lựa chọn thì gộp số lượng. */
export const sameOptions = (a, b) => a.menuItemId === b.menuItemId && a.sizeId === b.sizeId
  && [...(a.toppingIds || [])].sort().join(',') === [...(b.toppingIds || [])].sort().join(',')
  && a.sugarLevel === b.sugarLevel && a.iceLevel === b.iceLevel && (a.note || '') === (b.note || '')

/** Tìm không dấu: "ca phe" khớp "Cà phê". */
export const plainText = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
