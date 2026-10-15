import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'

export default function ManagerOverview() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, lowStock: 0, ok: 0 })
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([
      inventoryApi.stats(),
      inventoryApi.lowStock()
    ])
      .then(([statsRes, lowStockRes]) => {
        if (!mounted) return
        setStats(statsRes.data || { total: 0, lowStock: 0, ok: 0 })
        setLowStockItems(lowStockRes.data || [])
      })
      .catch((err) => {
        if (mounted) setError(errorMessage(err))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [])

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="page-title">Xin chào, {user?.fullName || 'Quản lý'}</h1>
          <p className="page-subtitle mb-0">Tổng quan tình hình nguyên liệu và vận hành kho cửa hàng.</p>
        </div>
        <Link to="/manager/inventory" className="btn btn-primary d-flex align-items-center gap-2">
          <i className="bi bi-box-seam" /> Vào Quản lý kho
        </Link>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="row g-3 mb-4">
        {/* Total items */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="cf-card stat-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="cf-muted small mb-2">Tổng nguyên liệu quản lý</div>
                <div className="stat-value">{loading ? '—' : stats.total}</div>
                <div className="small text-muted mt-1">Đang theo dõi trong danh mục</div>
              </div>
              <span className="stat-icon" style={{ background: 'var(--cf-card)', color: 'var(--cf-primary)' }}>
                <i className="bi bi-boxes" />
              </span>
            </div>
          </div>
        </div>

        {/* Low stock warning */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="cf-card stat-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="cf-muted small mb-2">Nguyên liệu sắp hết</div>
                <div className={`stat-value ${stats.lowStock > 0 ? 'text-danger' : ''}`}>
                  {loading ? '—' : stats.lowStock}
                </div>
                <div className="small text-muted mt-1">
                  {stats.lowStock > 0 ? 'Cần lập kế hoạch nhập gấp' : 'Không có mặt hàng nào thiếu'}
                </div>
              </div>
              <span className="stat-icon" style={{ background: stats.lowStock > 0 ? '#fee2e2' : 'var(--cf-card)', color: stats.lowStock > 0 ? '#dc2626' : '#16a34a' }}>
                <i className={`bi ${stats.lowStock > 0 ? 'bi-exclamation-triangle-fill' : 'bi-shield-check'}`} />
              </span>
            </div>
          </div>
        </div>

        {/* Stock OK */}
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="cf-card stat-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="cf-muted small mb-2">Tồn kho an toàn</div>
                <div className="stat-value text-success">{loading ? '—' : stats.ok}</div>
                <div className="small text-muted mt-1">Đạt trên định mức tối thiểu</div>
              </div>
              <span className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <i className="bi bi-check-circle-fill" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Low stock alert section */}
      <div className="cf-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="cf-section-title mb-1">
              <i className="bi bi-bell-fill text-warning me-2" />
              Cảnh báo nguyên liệu chạm ngưỡng tối thiểu
            </h5>
            <p className="text-muted small mb-0">Các nguyên liệu có số lượng tồn nhỏ hơn hoặc bằng định mức quy định</p>
          </div>
          <Link to="/manager/inventory" className="btn btn-sm btn-light-soft">
            Xem tất cả trong kho &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary spinner-border-sm" /></div>
        ) : lowStockItems.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-patch-check-fill text-success fs-2 d-block mb-2" />
            <div>Tuyệt vời! Hiện tại kho không có nguyên liệu nào chạm mức báo động.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Tên nguyên liệu</th>
                  <th className="text-end">Tồn hiện tại</th>
                  <th className="text-end">Mức tối thiểu</th>
                  <th className="text-center">Tình trạng</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(item => (
                  <tr key={item.id}>
                    <td className="fw-medium">{item.itemName}</td>
                    <td className="text-end fw-bold text-danger">
                      {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit}
                    </td>
                    <td className="text-end text-muted">
                      {Number(item.minimumStockLevel).toLocaleString('vi-VN')} {item.unit}
                    </td>
                    <td className="text-center">
                      <span className="cf-badge badge-locked">Sắp hết</span>
                    </td>
                    <td className="text-end">
                      <Link to="/manager/inventory" className="btn btn-sm btn-outline-primary py-0 px-2">
                        Nhập hàng
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
