import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import productApi from '../api/productApi'

// Trang danh sách: gọi API lấy dữ liệu -> lưu vào state -> hiển thị bảng.
export default function ProductList() {
  const [products, setProducts] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchProducts = async (kw = '') => {
    try {
      setLoading(true)
      setError('')
      const res = await productApi.getAll(kw)
      setProducts(res.data)
    } catch (e) {
      setError('Không tải được dữ liệu. Backend đã chạy chưa?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, []) // chạy 1 lần khi mở trang

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa?')) return
    await productApi.remove(id)
    fetchProducts(keyword)
  }

  return (
    <>
      <div className="d-flex gap-2 mb-3">
        <input
          className="form-control"
          placeholder="Tìm theo tên..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => fetchProducts(keyword)}>Tìm</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="text-muted">Đang tải...</div>}

      <table className="table table-striped table-hover align-middle">
        <thead className="table-dark">
          <tr>
            <th>ID</th><th>Tên</th><th>Giá</th><th>Số lượng</th><th style={{ width: 160 }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{Number(p.price).toLocaleString('vi-VN')} đ</td>
              <td>{p.quantity}</td>
              <td>
                <Link className="btn btn-sm btn-warning me-2" to={`/products/${p.id}/edit`}>Sửa</Link>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Xóa</button>
              </td>
            </tr>
          ))}
          {!loading && products.length === 0 && (
            <tr><td colSpan="5" className="text-center text-muted">Chưa có dữ liệu</td></tr>
          )}
        </tbody>
      </table>
    </>
  )
}
