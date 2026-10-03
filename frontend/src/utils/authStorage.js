// "Ghi nhớ đăng nhập" -> localStorage (giữ khi tắt trình duyệt), ngược lại -> sessionStorage.
const KEY = 'cafe_auth'

function safe(fn, fallback = null) {
  try { return fn() } catch { return fallback }
}

export function loadAuth() {
  const raw = safe(() => localStorage.getItem(KEY)) || safe(() => sessionStorage.getItem(KEY))
  return raw ? safe(() => JSON.parse(raw)) : null
}

export function saveAuth(auth, remember) {
  clearAuth()
  safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(auth)))
}

export function updateStoredUser(user) {
  for (const getStore of [() => localStorage, () => sessionStorage]) {
    safe(() => {
      const store = getStore()
      const raw = store.getItem(KEY)
      if (raw) store.setItem(KEY, JSON.stringify({ ...JSON.parse(raw), user }))
    })
  }
}

export function clearAuth() {
  safe(() => localStorage.removeItem(KEY))
  safe(() => sessionStorage.removeItem(KEY))
}

export function getToken() {
  return loadAuth()?.token || null
}
