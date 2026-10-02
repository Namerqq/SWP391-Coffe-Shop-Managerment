import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import AppNavbar from './components/AppNavbar'
import ManagerLayout from './components/ManagerLayout'
import ProductList from './pages/ProductList'
import ProductForm from './pages/ProductForm'
import CategoryManagement from './pages/manager/CategoryManagement'
import MenuItemManagement from './pages/manager/MenuItemManagement'
import CustomerMenu from './pages/customer/CustomerMenu'

// Layout cũ của module mẫu Product
function DemoLayout() {
  return (
    <>
      <AppNavbar />
      <div className="container py-4"><Outlet /></div>
    </>
  )
}

// App = nơi khai báo ĐƯỜNG DẪN (URL) -> TRANG (page) tương ứng.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/manager/menu-items" />} />

      {/* Khách quét QR trên bàn -> /order/TABLE-01 (qr_code của bàn, không có sidebar) */}
      <Route path="/order/:qrCode" element={<CustomerMenu />} />

      {/* Manager */}
      <Route path="/manager" element={<ManagerLayout />}>
        <Route index element={<Navigate to="menu-items" />} />
        <Route path="menu-items" element={<MenuItemManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
      </Route>

      {/* Module mẫu */}
      <Route element={<DemoLayout />}>
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/:id/edit" element={<ProductForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
