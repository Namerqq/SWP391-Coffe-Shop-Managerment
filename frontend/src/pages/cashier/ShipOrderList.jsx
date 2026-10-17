import { useCallback, useMemo, useState } from 'react'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, formatTime, itemOptionsText } from '../../utils/orderFormat'
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

/** Nhãn và màu sắc badge trạng thái */
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
  const [feedback, setFeedback] = useState(null)
  const [processingId, setProcessingId] = useState(null)
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

  // Tự động cập nhật ngầm mỗi 10 giây
  usePolling(loadOrders, 10000)

  // Xác nhận đơn giao hàng (chuyển sang Barista chế biến)
  const handleConfirm = async (order) => {
    try {
      setProcessingId(order.orderId)
      setFeedback(null)
      await cashierApi.confirmDeliveryOrder(order.orderId)
      setFeedback({
        type: 'success',
        message: `Đã xác nhận đơn ${order.displayNumber || '#' + order.orderId}. Đơn đã chuyển sang quầy Barista!`,
      })
      await loadOrders()
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: errorMessage(err, 'Không thể xác nhận đơn hàng.'),
      })
    } finally {
      setProcessingId(null)
    }
  }

  // Hủy đơn giao hàng do hết nguyên liệu
  const handleCancel = async (order) => {
    const ok = window.confirm(
      `Xác nhận hủy đơn ${order.displayNumber || '#' + order.orderId} do hết nguyên liệu?`
    )
    if (!ok) return

    try {
      setProcessingId(order.orderId)
      setFeedback(null)
      await cashierApi.cancelDeliveryOrder(order.orderId, 'Hết nguyên liệu')
      setFeedback({
        type: 'success',
        message: `Đã hủy đơn ${order.displayNumber || '#' + order.orderId} (Hết nguyên liệu).`,
      })
      await loadOrders()
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: errorMessage(err, 'Không thể hủy đơn hàng.'),
      })
    } finally {
      setProcessingId(null)
    }
  }

  // Lọc danh sách đơn theo từ khóa và tab
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
      {feedback && (
        <div className={`alert alert-${feedback.type} alert-dismissible fade show py-2 mb-3`} role="alert">
          {feedback.message}
          <button type="button" className="btn-close py-2" onClick={() => setFeedback(null)} aria-label="Close" />
        </div>
      )}

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

      {/* Danh sách đơn hàng giao tận nơi */}
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
            const isPending = o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING'
            const isProcessing = processingId === o.orderId
            const isPaid = o.paymentStatus === 'PAID'
            const paymentMethodText =
              o.paymentMethod === 'VNPAY' ? 'VNPay' : o.paymentMethod === 'MOMO' ? 'MoMo' : 'Tiền mặt (COD)'

            return (
              <div key={o.orderId} className="col-12 col-lg-6 col-xl-4">
                <div className="card h-100 border shadow-sm" style={{ borderRadius: '0.85rem' }}>
                  {/* Mã đơn và Trạng thái */}
                  <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-bold text-dark me-2">{o.displayNumber || `#ONL-${o.orderId}`}</span>
                      <small className="text-muted">{formatTime(o.createdAt)}</small>
                    </div>
                    <span className={badge.pillClass}>{badge.label}</span>
                  </div>

                  {/* Thông tin khách hàng & Địa chỉ giao hàng */}
                  <div className="card-body p-3 d-flex flex-column">
                    <div className="mb-2">
                      <div className="fw-semibold text-dark">
                        <i className="bi bi-person me-1 text-secondary" />
                        {o.customerName || 'Khách vãng lai'} &bull;{' '}
                        <a href={`tel:${o.customerPhone}`} className="text-decoration-none">
                          {o.customerPhone || '—'}
                        </a>
                      </div>
                      <div className="small text-muted mt-1">
                        <i className="bi bi-geo-alt me-1 text-danger" />
                        {o.deliveryAddress || 'Chưa có địa chỉ'}
                      </div>
                      {o.customerNote && (
                        <div className="small text-muted fst-italic mt-1">
                          <i className="bi bi-chat-left-text me-1 text-info" />
                          "{o.customerNote}"
                        </div>
                      )}
                      {o.cancelReason && (
                        <div className="small text-danger fst-italic mt-1">
                          <i className="bi bi-info-circle me-1" />
                          Lý do hủy: {o.cancelReason}
                        </div>
                      )}
                    </div>

                    {/* Danh sách món */}
                    <div
                      className="border rounded-2 p-2 bg-light bg-opacity-50 my-2 flex-grow-1"
                      style={{ maxHeight: '160px', overflowY: 'auto' }}
                    >
                      {o.items?.map((it, idx) => (
                        <div
                          key={idx}
                          className={`d-flex justify-content-between align-items-baseline py-1 small ${
                            idx < (o.items?.length || 0) - 1 ? 'border-bottom' : ''
                          }`}
                        >
                          <div>
                            <span className="fw-bold me-1">{it.quantity}x</span>
                            <span>{it.itemName}</span>
                            {itemOptionsText(it) && (
                              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                                {itemOptionsText(it)}
                              </div>
                            )}
                            {it.note && (
                              <div className="text-warning-emphasis fst-italic" style={{ fontSize: '0.78rem' }}>
                                Ghi chú: {it.note}
                              </div>
                            )}
                          </div>
                          <div className="text-nowrap ms-2 fw-semibold">
                            {formatMoney(it.subtotal || it.unitPrice * it.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Thông tin thanh toán & Tổng tiền */}
                    <div className="pt-2 border-top d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <div className="small text-muted">{paymentMethodText}</div>
                        <span
                          className={`badge ${
                            isPaid ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'
                          } border`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </div>
                      <div className="text-end">
                        <div className="small text-muted">Tổng tiền</div>
                        <span className="fw-bold text-primary fs-6">{formatMoney(o.totalAmount)}</span>
                      </div>
                    </div>

                    {/* Nút thao tác dành cho đơn Chờ duyệt */}
                    {isPending && (
                      <div className="pt-2 border-top d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm flex-fill"
                          disabled={isProcessing}
                          onClick={() => handleCancel(o)}
                        >
                          {isProcessing ? (
                            <span className="spinner-border spinner-border-sm me-1" />
                          ) : (
                            <i className="bi bi-x-circle me-1" />
                          )}
                          Hủy đơn
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm flex-fill"
                          disabled={isProcessing}
                          onClick={() => handleConfirm(o)}
                        >
                          {isProcessing ? (
                            <span className="spinner-border spinner-border-sm me-1" />
                          ) : (
                            <i className="bi bi-check-circle me-1" />
                          )}
                          Xác nhận đơn
                        </button>
                      </div>
                    )}
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
