import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import managerDashboardApi from '../../api/managerDashboardApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'
import { formatDateTime } from '../../utils/format'

/**
 * Manager Dashboard (UC-RP01, UC-RP02, UC-IV03, UC-B05).
 * Hiển thị toàn diện 5 nhóm thông tin vận hành cho Quản lý:
 * 1. Doanh thu & Hóa đơn hôm nay (kèm tỷ lệ so sánh hôm qua)
 * 2. Số bàn đang có khách (Occupied tables)
 * 3. Món đang mở bán trong thực đơn (Active menu items)
 * 4. Danh sách cảnh báo nguyên liệu sắp hết (Low-stock list & SRS Background Job #1 status)
 * 5. Yêu cầu thiếu nguyên liệu từ quầy Barista (Barista shortage reports)
 */
export default function ManagerOverview() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshingJob, setRefreshingJob] = useState(false)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await managerDashboardApi.getSummary()
      setData(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Không tải được dữ liệu tổng quan quản lý.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleTriggerJob = async () => {
    setRefreshingJob(true)
    try {
      await managerDashboardApi.triggerLowStockJob()
      await loadDashboard()
    } catch (err) {
      setError(errorMessage(err, 'Không thể kích hoạt quét kho.'))
    } finally {
      setRefreshingJob(false)
    }
  }

  const tableRate = data?.totalTables ? Math.round((data.occupiedTables / data.totalTables) * 100) : 0
  const menuRate = data?.totalMenuItems ? Math.round((data.activeMenuItems / data.totalMenuItems) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="page-title">Bảng điều khiển Quản lý</h1>
          <p className="page-subtitle mb-0">
            Xin chào, <strong>{user?.fullName || 'Quản lý'}</strong>! Tổng quan hoạt động kinh doanh, bàn và kho quán.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-light-soft d-flex align-items-center gap-1 shadow-sm"
            onClick={loadDashboard}
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`} /> Làm mới
          </button>
          <Link to="/manager/revenue" className="btn btn-outline-primary d-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-graph-up" /> Báo cáo doanh thu
          </Link>
          <Link to="/manager/inventory" className="btn btn-primary d-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-box-seam" /> Kho nguyên liệu
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4 shadow-sm">{error}</div>}

      {/* 4 KPI Cards hàng đầu */}
      <div className="row g-3 mb-4">
        {/* KPI 1: Doanh thu hôm nay */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="cf-card stat-card h-100 p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="cf-muted small mb-1 fw-medium">Doanh thu hôm nay</div>
                <div className="stat-value text-primary fs-3 fw-bold">
                  {loading ? '—' : formatMoney(data?.todayRevenue || 0)}
                </div>
                <div className="small text-muted mt-1">
                  Hôm qua: {loading ? '—' : formatMoney(data?.yesterdayRevenue || 0)}
                </div>
              </div>
              <span className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <i className="bi bi-cash-stack" />
              </span>
            </div>
            <div className="mt-2 pt-2 border-top">
              <Link to="/manager/revenue" className="small text-decoration-none fw-semibold">
                Chi tiết doanh thu &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* KPI 2: Hóa đơn & Bàn đang phục vụ */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="cf-card stat-card h-100 p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="cf-muted small mb-1 fw-medium">Bàn đang có khách</div>
                <div className="stat-value fs-3 fw-bold">
                  {loading ? '—' : `${data?.occupiedTables || 0} / ${data?.totalTables || 0}`}
                </div>
                <div className="small text-muted mt-1">
                  Đạt {loading ? '—' : `${tableRate}%`} công suất phục vụ
                </div>
              </div>
              <span className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <i className="bi bi-grid-3x3-gap-fill" />
              </span>
            </div>
            <div className="mt-2 pt-2 border-top">
              <span className="small text-muted">
                Đã thu: <strong>{data?.todayInvoices || 0}</strong> hóa đơn hôm nay
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Món đang mở bán */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="cf-card stat-card h-100 p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="cf-muted small mb-1 fw-medium">Món đang mở bán</div>
                <div className="stat-value text-success fs-3 fw-bold">
                  {loading ? '—' : `${data?.activeMenuItems || 0} / ${data?.totalMenuItems || 0}`}
                </div>
                <div className="small text-muted mt-1">
                  {loading ? '—' : `${menuRate}%`} món sẵn sàng phục vụ
                </div>
              </div>
              <span className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <i className="bi bi-cup-hot-fill" />
              </span>
            </div>
            <div className="mt-2 pt-2 border-top">
              <Link to="/manager/menu-items" className="small text-decoration-none fw-semibold">
                Quản lý thực đơn &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* KPI 4: Nguyên liệu sắp hết (Low-stock) */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="cf-card stat-card h-100 p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="cf-muted small mb-1 fw-medium">Cảnh báo nguyên liệu</div>
                <div className={`stat-value fs-3 fw-bold ${data?.lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>
                  {loading ? '—' : data?.lowStockCount}
                </div>
                <div className="small text-muted mt-1">
                  {data?.lowStockCount > 0 ? 'Chạm ngưỡng tối thiểu' : 'Tồn kho đều an toàn'}
                </div>
              </div>
              <span
                className="stat-icon"
                style={{
                  background: data?.lowStockCount > 0 ? '#fee2e2' : '#f0fdf4',
                  color: data?.lowStockCount > 0 ? '#dc2626' : '#16a34a',
                }}
              >
                <i className={`bi ${data?.lowStockCount > 0 ? 'bi-exclamation-triangle-fill' : 'bi-shield-check'}`} />
              </span>
            </div>
            <div className="mt-2 pt-2 border-top">
              <Link to="/manager/inventory" className="small text-decoration-none fw-semibold">
                Vào kho nguyên liệu &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Khối 1: Danh sách cảnh báo nguyên liệu sắp hết (UC-IV03) */}
        <div className="col-12 col-xl-7">
          <div className="cf-card p-4 h-100">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
              <div>
                <h5 className="cf-section-title mb-1 d-flex align-items-center gap-2">
                  <i className="bi bi-bell-fill text-warning" />
                  Cảnh báo nguyên liệu chạm ngưỡng (UC-IV03)
                </h5>
                <p className="text-muted small mb-0">
                  SRS Background Job #1 tự động quét định kỳ. Lần quét gần nhất:{' '}
                  <strong>{formatDateTime(data?.lowStockLastCheckedAt)}</strong>
                </p>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={handleTriggerJob}
                  disabled={refreshingJob}
                  title="Kích hoạt SRS Background Job #1 quét lại ngay"
                >
                  <i className={`bi bi-play-circle ${refreshingJob ? 'spin' : ''}`} />
                  {refreshingJob ? 'Đang quét...' : 'Quét ngay'}
                </button>
                <Link to="/manager/inventory" className="btn btn-sm btn-light-soft">
                  Xem tất cả kho &rarr;
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary spinner-border-sm" />
              </div>
            ) : !data?.lowStockItems || data.lowStockItems.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-patch-check-fill text-success fs-1 d-block mb-2" />
                <div className="fw-semibold text-dark">Tuyệt vời! Kho đang ở mức an toàn.</div>
                <div className="small">Không có nguyên liệu nào chạm hoặc dưới ngưỡng tối thiểu.</div>
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
                    {data.lowStockItems.map((item) => (
                      <tr key={item.id}>
                        <td className="fw-medium">{item.itemName}</td>
                        <td className="text-end fw-bold text-danger">
                          {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit}
                        </td>
                        <td className="text-end text-muted">
                          {Number(item.minimumStockLevel).toLocaleString('vi-VN')} {item.unit}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1">
                            Sắp hết
                          </span>
                        </td>
                        <td className="text-end">
                          <Link to="/manager/inventory" className="btn btn-sm btn-outline-primary py-0 px-2">
                            Nhập kho
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

        {/* Khối 2: Yêu cầu thiếu nguyên liệu từ quầy Barista (Barista shortage reports - UC-B05 / UC-IV04) */}
        <div className="col-12 col-xl-5">
          <div className="cf-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="cf-section-title mb-1 d-flex align-items-center gap-2">
                  <i className="bi bi-cup-straw text-primary" />
                  Yêu cầu thiếu từ quầy Pha chế
                </h5>
                <p className="text-muted small mb-0">Các phiếu báo thiếu nguyên liệu đang chờ Quản lý duyệt</p>
              </div>
              <Link to="/manager/stock-receipts" className="btn btn-sm btn-light-soft">
                Xem phiếu &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary spinner-border-sm" />
              </div>
            ) : !data?.pendingShortageReports || data.pendingShortageReports.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary" />
                <div className="fw-semibold text-dark">Không có yêu cầu thiếu nào đang chờ</div>
                <div className="small">Quầy pha chế chưa gửi yêu cầu bổ sung nguyên liệu mới.</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {data.pendingShortageReports.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="p-3 border rounded-3 d-flex justify-content-between align-items-center bg-light-subtle"
                  >
                    <div>
                      <div className="fw-bold text-dark font-monospace">{receipt.receiptCode}</div>
                      <div className="small text-muted">
                        Bởi: <strong>{receipt.createdByName || 'Barista'}</strong> · Ngày: {receipt.receiptDate}
                      </div>
                      {receipt.note && (
                        <div className="small text-secondary fst-italic mt-1 text-truncate" style={{ maxWidth: '240px' }}>
                          {receipt.note}
                        </div>
                      )}
                    </div>
                    <div className="text-end">
                      <Link to="/manager/stock-receipts" className="btn btn-sm btn-primary py-1 px-2">
                        Xử lý
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
