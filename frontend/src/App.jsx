import { Routes, Route, Navigate } from 'react-router-dom'
import AppNavbar from './components/AppNavbar'
import ProductList from './pages/ProductList'
import ProductForm from './pages/ProductForm'

// App = nơi khai báo ĐƯỜNG DẪN (URL) -> TRANG (page) tương ứng.
export default function App() {
  return (
    <>
      <AppNavbar />
      <div className="container py-4">
        <Routes>
          <Route path="/" element={<Navigate to="/products" />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
        </Routes>
      </div>
    </>
  )
}
