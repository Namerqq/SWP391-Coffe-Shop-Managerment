import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authApi from '../api/authApi'
import { clearAuth, loadAuth, saveAuth, updateStoredUser } from '../utils/authStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => loadAuth()?.user || null)

  const login = async (identifier, password, remember) => {
    const res = await authApi.login(identifier, password)
    saveAuth({ token: res.data.token, user: res.data.user }, remember)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* token có thể đã hết hạn */ }
    clearAuth()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  /** Cập nhật thông tin người đang đăng nhập (vd: Admin tự sửa tên mình). */
  const refreshUser = useCallback((u) => {
    updateStoredUser(u)
    setUser(u)
  }, [])

  // Backend trả 401 -> phiên hết hạn -> về trang đăng nhập.
  useEffect(() => {
    const onExpired = () => {
      clearAuth()
      setUser(null)
      navigate('/login', { replace: true, state: { expired: true } })
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [navigate])

  // Mở lại trang: kiểm tra token còn hợp lệ & lấy thông tin mới nhất.
  useEffect(() => {
    if (!loadAuth()?.token) return
    authApi.me()
      .then((res) => refreshUser(res.data))
      .catch((e) => {
        if (e.response?.status === 401) window.dispatchEvent(new CustomEvent('auth:expired'))
      })
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
