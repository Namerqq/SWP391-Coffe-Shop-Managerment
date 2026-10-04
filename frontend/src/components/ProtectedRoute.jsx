import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeOf } from '../routes/registry'

// Chặn trang khi chưa đăng nhập hoặc không đúng vai trò (sai vai trò -> về trang của vai trò đó).
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.roleName)) return <Navigate to={homeOf(user)} replace />
  return children
}
