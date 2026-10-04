import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import HomeLayout from './layouts/HomeLayout'
import LoginPage from './pages/LoginPage'
import StaffHome from './pages/StaffHome'
import AdminOverview from './pages/admin/AdminOverview'
import AccountList from './pages/admin/AccountList'
import AccountDetail from './pages/admin/AccountDetail'
import SystemSettings from './pages/admin/SystemSettings'
import HomePage from './pages/home/HomePage'
import MenuPage from './pages/home/MenuPage'
import OnlineOrderSoon from './pages/home/OnlineOrderSoon'
import { danmtRoutes } from './routes/danmtRoutes'
import { thangnnRoutes } from './routes/thangnnRoutes'
import { managerRoutes } from './routes/managerRoutes'

// App = nơi khai báo ĐƯỜNG DẪN (URL) -> TRANG (page) tương ứng.
export default function App() {
  return (
    <Routes>
      {/* Trang dành cho khách - tách riêng hệ thống quản lý */}
      <Route element={<HomeLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/thuc-don" element={<MenuPage />} />
        <Route path="/dat-hang-online" element={<OnlineOrderSoon />} />
      </Route>

      {/* Hệ thống quản lý (nhân viên) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<ProtectedRoute><StaffHome /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminOverview />} />
        <Route path="accounts" element={<AccountList />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="settings" element={<SystemSettings />} />
      </Route>

      {/* Màn hình của từng thành viên (mỗi người 1 file riêng trong src/routes) */}
      {danmtRoutes}
      {thangnnRoutes}
      {managerRoutes}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
