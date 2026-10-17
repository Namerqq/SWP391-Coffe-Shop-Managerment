import { useCallback, useMemo, useState } from 'react'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatTime } from '../../utils/orderFormat'
import usePolling from '../../utils/usePolling'

// Trạng thái đơn giao hàng
const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'DELIVERING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Đã hủy' },
]

function getStatusBadge(order) {
  if (order.status === 'CANCELLED' || order.deliveryStatus === 'CANCELLED') {
    return { label: 'Đã hủy', pillClass: 'status-pill tone-cancelled' }
  }
  if (order.status === 'COMPLETED' || order.deliveryStatus === 'DELIVERED') {
    return { label: 'Đã giao', pillClass: 'status-pill tone-ready' }
  }
  if (order.deliveryStatus === 'OUT_FOR_DELIVERY' || order.deliveryStatus === 'PICKED_UP') {
    return { label: 'Đang giao', pillClass: 'status-pill tone-pending' }
  }
  if (order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'READY') {
    return { label: 'Đã xác nhận', pillClass: 'status-pill tone-preparing' }
  }
  return { label: 'Chờ duyệt', pillClass: 'status-pill tone-pending' }
}

export default function ShipOrderList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [keyword, setKeyword] = useState('')

  // Tải danh sách đơn giao hàng từ API
  const loadOrders = useCallback(async () => {
    try {
      const res = await cashierApi.getDeliveryOrders()
      setOrders(res.data || [])
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách đơn giao hàng.'))
    } finally {
      setLoading(false)
    }
  }, [])


  usePolling(loadOrders, 10000)


  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase()
        const matchName = o.customerName?.toLowerCase().includes(kw)
        const matchPhone = o.customerPhone?.toLowerCase().includes(kw)
        const matchAddr = o.deliveryAddress?.toLowerCase().includes(kw)
        const matchNo = (o.displayNumber || o.orderNumber || '').toLowerCase().includes(kw)
        if (!matchName && !matchPhone && !matchAddr && !matchNo) return false
      }

      if (activeTab === 'ALL') return true
      if (activeTab === 'CANCELLED') return o.status === 'CANCELLED' || o.deliveryStatus === 'CANCELLED'
      if (activeTab === 'COMPLETED') return o.status === 'COMPLETED' || o.deliveryStatus === 'DELIVERED'
      if (activeTab === 'DELIVERING') return o.deliveryStatus === 'OUT_FOR_DELIVERY' || o.deliveryStatus === 'PICKED_UP'
      if (activeTab === 'CONFIRMED') return o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY'
      if (activeTab === 'PENDING') return o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING'
      return true
    })
  }, [orders, activeTab, keyword])

  // Đếm số lượng đơn theo từng tab
  const counts = useMemo(() => {
    const res = { ALL: orders.length, PENDING: 0, CONFIRMED: 0, DELIVERING: 0, COMPLETED: 0, CANCELLED: 0 }
    orders.forEach((o) => {
      if (o.status === 'CANCELLED' || o.deliveryStatus === 'CANCELLED') res.CANCELLED++
      else if (o.status === 'COMPLETED' || o.deliveryStatus === 'DELIVERED') res.COMPLETED++
      else if (o.deliveryStatus === 'OUT_FOR_DELIVERY' || o.deliveryStatus === 'PICKED_UP') res.DELIVERING++
      else if (o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY') res.CONFIRMED++
      else res.PENDING++
    })
    return res
  }, [orders])

  return (
    <div className="staff-content p-3 p-md-4">
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* Bộ lọc Tab + Thanh tìm kiếm */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="chip-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="chip-count">({counts[tab.key] || 0})</span>
            </button>
          ))}
        </div>

        <div style={{ maxWidth: '280px', width: '100%' }}>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-white">
              <i className="bi bi-search text-muted" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên, SĐT, địa chỉ..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button className="btn btn-outline-secondary" onClick={() => setKeyword('')}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách đơn hàng cơ bản */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <div className="text-muted mt-2">Đang tải danh sách đơn giao hàng...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center text-muted">
          <div className="fs-1 mb-2">📦</div>
          <h6 className="fw-bold">Không có đơn giao hàng nào</h6>
          <p className="small mb-0">
            {keyword ? 'Không tìm thấy kết quả phù hợp với từ khóa.' : 'Chưa có đơn hàng nào ở trạng thái này.'}
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredOrders.map((o) => {
            const badge = getStatusBadge(o)
            return (
              <div key={o.orderId} className="col-12 col-lg-6 col-xl-4">
                <div className="card h-100 border shadow-sm" style={{ borderRadius: '0.85rem' }}>
                  <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">{o.displayNumber || `#ONL-${o.orderId}`}</span>
                    <span className={badge.pillClass}>{badge.label}</span>
                  </div>
                  <div className="card-body p-3">
                    <div className="text-muted small">Thời gian đặt: {formatTime(o.createdAt)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
