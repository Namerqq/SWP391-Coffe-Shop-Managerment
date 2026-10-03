import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/LoginPage'
import AdminOverview from './pages/admin/AdminOverview'
import AccountList from './pages/admin/AccountList'
import AccountDetail from './pages/admin/AccountDetail'
import SystemSettings from './pages/admin/SystemSettings'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminOverview />} />
        <Route path="accounts" element={<AccountList />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="settings" element={<SystemSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}