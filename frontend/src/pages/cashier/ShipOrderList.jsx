import { useState } from 'react'
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

const EMPTY_SEARCH = { from: '', to: '', code: '' }

/** "2026-10-26T23:59" -> "2026-10-27T00:00": backend lọc [from, to) nên cộng 1 phút để tính cả phút đã chọn. */
function plusOneMinute(value) {
  const [date, time] = value.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const t = new Date(y, m - 1, d, h, min + 1)
  const pad = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`
}

/** Tham số gửi lên GET /cashier/delivery-orders (bỏ ô trống). */
function toSearchParams(search) {
  const params = {}
  if (search.from) params.from = search.from
  if (search.to) params.to = plusOneMinute(search.to)
  const code = search.code.replace(/[\s#]/g, '')
  if (code) params.code = code
  return params
}

export default function ShipOrderList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [activeTab, setActiveTab] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  // Tìm đơn theo thời gian đặt / mã đơn: searchForm = đang nhập, search = đang áp dụng (gửi lên server)
  const [searchForm, setSearchForm] = useState(EMPTY_SEARCH)
  const [search, setSearch] = useState(EMPTY_SEARCH)
  const [searchError, setSearchError] = useState('')
  const isSearching = Boolean(search.from || search.to || search.code)

  // Tải danh sách đơn giao hàng từ API (kèm điều kiện tìm đang áp dụng)
  const loadOrders = async (current = search) => {
    try {
      const res = await cashierApi.getDeliveryOrders(toSearchParams(current))
      setOrders(res.data || [])
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách đơn giao hàng.'))
    } finally {
      setLoading(false)
    }
  }

  // Tự động cập nhật ngầm mỗi 10 giây
  usePolling(loadOrders, 10000)

  const changeSearch = (field) => (e) => setSearchForm((f) => ({ ...f, [field]: e.target.value }))

  // Bấm "Tìm": kiểm tra rồi tải lại danh sách theo điều kiện mới
  const applySearch = (e) => {
    e.preventDefault()
    if (searchForm.from && searchForm.to && searchForm.from > searchForm.to) {
      setSearchError('Thời gian "Từ" phải trước thời gian "Đến".')
      return
    }
    if (!/^[\d\s#-]*$/.test(searchForm.code)) {
      setSearchError('Mã đơn chỉ gồm số và dấu gạch, ví dụ 261026-0012 hoặc 0012.')
      return
    }
    setSearchError('')
    setSearch(searchForm)
    setLoading(true)
    loadOrders(searchForm)
  }

  const clearSearch = () => {
    setSearchForm(EMPTY_SEARCH)
    setSearch(EMPTY_SEARCH)
    setSearchError('')
    setLoading(true)
    loadOrders(EMPTY_SEARCH)
  }

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
      // Thu ngân khác đã xử lý đơn này trước (409): tải lại để thẻ đơn hiện đúng trạng thái, ẩn nút thao tác.
      if (err.response?.status === 409) await loadOrders()
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
      // Thu ngân khác đã xử lý đơn này trước (409): tải lại để thẻ đơn hiện đúng trạng thái, ẩn nút thao tác.
      if (err.response?.status === 409) await loadOrders()
    } finally {
      setProcessingId(null)
    }
  }

  // Lọc danh sách đơn theo từ khóa và tab
  const filteredOrders = orders.filter((o) => {
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

  // Đếm số lượng đơn theo từng tab
  const counts = { ALL: orders.length, PENDING: 0, CONFIRMED: 0, DELIVERING: 0, COMPLETED: 0, CANCELLED: 0 }
  orders.forEach((o) => {
    if (o.status === 'CANCELLED' || o.deliveryStatus === 'CANCELLED') counts.CANCELLED++
    else if (o.status === 'COMPLETED' || o.deliveryStatus === 'DELIVERED') counts.COMPLETED++
    else if (o.deliveryStatus === 'OUT_FOR_DELIVERY' || o.deliveryStatus === 'PICKED_UP') counts.DELIVERING++
    else if (o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY') counts.CONFIRMED++
    else counts.PENDING++
  })

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

      {/* Tìm đơn theo thời gian đặt đơn và mã đơn (lọc ở server) */}
      <form className="card border-0 shadow-sm p-3 mb-3" onSubmit={applySearch} noValidate>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-sm-6 col-lg-3">
            <label htmlFor="so-from" className="form-label small mb-1">Từ</label>
            <input
              id="so-from"
              type="datetime-local"
              className="form-control form-control-sm"
              value={searchForm.from}
              onChange={changeSearch('from')}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <label htmlFor="so-to" className="form-label small mb-1">Đến</label>
            <input
              id="so-to"
              type="datetime-local"
              className="form-control form-control-sm"
              value={searchForm.to}
              onChange={changeSearch('to')}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <label htmlFor="so-code" className="form-label small mb-1">Mã đơn</label>
            <input
              id="so-code"
              type="text"
              className="form-control form-control-sm"
              placeholder="Ví dụ 261026-0012 hoặc 0012"
              value={searchForm.code}
              onChange={changeSearch('code')}
              maxLength={20}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3 d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm flex-fill">
              <i className="bi bi-search me-1" />
              Tìm
            </button>
            {isSearching && (
              <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" onClick={clearSearch}>
                Xóa lọc
              </button>
            )}
          </div>
        </div>
        {searchError && <div className="text-danger small mt-2">{searchError}</div>}
      </form>

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
            {keyword || isSearching
              ? 'Không tìm thấy đơn phù hợp với điều kiện tìm.'
              : 'Chưa có đơn hàng nào ở trạng thái này.'}
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredOrders.map((o) => {
            const badge = getStatusBadge(o)
            const isPending = o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING'
            const isProcessing = processingId === o.orderId
            const isPaid = o.paymentStatus === 'PAID'
            const PAYMENT_METHOD_LABEL = {
              CASH: 'Tiền mặt (COD)',
              BANK_TRANSFER: 'Chuyển khoản QR',
              PAYOS_QR: 'QR (chưa thanh toán)',
            }

            // trong map:
            const paymentMethodText = PAYMENT_METHOD_LABEL[o.paymentMethod] || o.paymentMethod

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
                          className={`d-flex justify-content-between align-items-baseline py-1 small ${idx < (o.items?.length || 0) - 1 ? 'border-bottom' : ''
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
                          className={`badge ${isPaid ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'
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
