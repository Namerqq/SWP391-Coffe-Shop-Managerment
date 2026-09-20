import { Link } from 'react-router-dom'

// Component dùng chung: thanh menu phía trên.
export default function AppNavbar() {
  return (
    <nav className="navbar navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/">Fullstack Project</Link>
        <Link className="btn btn-outline-light btn-sm" to="/products/new">+ Thêm sản phẩm</Link>
      </div>
    </nav>
  )
}
