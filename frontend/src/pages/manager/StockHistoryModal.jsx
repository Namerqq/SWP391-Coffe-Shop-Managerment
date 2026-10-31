import { useEffect, useState, useCallback } from 'react'
import inventoryApi from '../../api/inventoryApi'
import stockReceiptApi from '../../api/stockReceiptApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime } from '../../utils/format'

// Helper định dạng ngày YYYY-MM-DD
function toYMD(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper định dạng hiển thị DD/MM/YYYY
function toDMY(ymd) {
  if (!ymd) return ''
  const parts = ymd.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return ymd
}

function getTodayYMD() {
  return toYMD(new Date())
}

function getYesterdayYMD() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toYMD(d)
}

function shiftDateYMD(ymd, offsetDays) {
  const parts = ymd.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  d.setDate(d.getDate() + offsetDays)
  return toYMD(d)
}

// Helper lấy chuỗi YYYY-MM-DD từ nhiều định dạng ngày (chuỗi ISO, mảng số [Y,M,D], Date object)
function getTxDateYMD(value) {
  if (!value) return ''
  if (Array.isArray(value)) {
    const y = value[0]
    const m = String(value[1]).padStart(2, '0')
    const d = String(value[2]).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') {
    if (value.length >= 10 && value[4] === '-' && value[7] === '-') {
      return value.slice(0, 10)
    }
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) {
      return toYMD(d)
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toYMD(value)
  }
  return ''
}

// Helper lấy giờ phút giây HH:mm:ss
function getTxTimeOnly(value) {
  if (!value) return '—'
  if (Array.isArray(value)) {
    const hh = String(value[3] ?? 0).padStart(2, '0')
    const mm = String(value[4] ?? 0).padStart(2, '0')
    const ss = String(value[5] ?? 0).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  if (typeof value === 'string' && value.includes('T')) {
    const timePart = value.split('T')[1]
    if (timePart) return timePart.slice(0, 8)
  }
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  return String(value)
}

/**
 * Modal "Lịch sử nhập kho theo từng nguyên liệu" (Single Day View & Thẻ kho).
 * Tối ưu tra cứu, đối soát theo từng ngày đơn lẻ cho Quản lý & Thu ngân POS.
 */
export default function StockHistoryModal({ show, onClose, item }) {
  const [activeTab, setActiveTab] = useState('DAILY') // 'DAILY' | 'ALL'
  const [selectedDate, setSelectedDate] = useState(getTodayYMD)

  // Bộ lọc nâng cao cho Tab 2 (Thẻ kho toàn bộ)
  const [tab2FilterMode, setTab2FilterMode] = useState('DATE') // 'DATE' (lọc theo ngày đang xem) | 'ALL' (toàn bộ lịch sử)
  const [tab2Type, setTab2Type] = useState('ALL') // 'ALL' | 'STOCK_IN' | 'STOCK_OUT' | 'WASTE'

  // Dữ liệu đối soát Single Day View (Tab 1)
  const [dailyData, setDailyData] = useState(null)
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [errorDaily, setErrorDaily] = useState(null)

  // Dữ liệu thẻ kho toàn bộ (Tab 2)
  const [allHistory, setAllHistory] = useState([])
  const [loadingAll, setLoadingAll] = useState(false)

  // Popup xem chi tiết phiếu nhập gốc khi click mã phiếu
  const [previewReceipt, setPreviewReceipt] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Tải dữ liệu đối soát cho ngày được chọn
  const loadDailyHistory = useCallback(
    async (date) => {
      if (!item) return
      setLoadingDaily(true)
      setErrorDaily(null)
      try {
        const res = await inventoryApi.receiptHistory(item.id, date)
        setDailyData(res.data)
      } catch (err) {
        setErrorDaily(errorMessage(err))
      } finally {
        setLoadingDaily(false)
      }
    },
    [item]
  )

  // Tải dữ liệu thẻ kho tổng hợp
  const loadAllHistory = useCallback(async () => {
    if (!item) return
    setLoadingAll(true)
    try {
      const res = await inventoryApi.history(item.id)
      setAllHistory(res.data || [])
    } catch {
      // bỏ qua
    } finally {
      setLoadingAll(false)
    }
  }, [item])

  useEffect(() => {
    if (show && item) {
      setSelectedDate(getTodayYMD())
      setActiveTab('DAILY')
      setTab2FilterMode('DATE')
      setTab2Type('ALL')
      loadDailyHistory(getTodayYMD())
      loadAllHistory()
    }
  }, [show, item, loadDailyHistory, loadAllHistory])

  // Lắng nghe khi người dùng đổi ngày (đồng bộ cả 2 tab)
  const handleDateChange = (newDate) => {
    if (!newDate) return
    setSelectedDate(newDate)
    loadDailyHistory(newDate)
    setTab2FilterMode('DATE')
  }

  // Xem hóa đơn gốc
  const handleViewReceipt = async (receiptId) => {
    if (!receiptId) return
    setLoadingPreview(true)
    try {
      const res = await stockReceiptApi.get(receiptId)
      setPreviewReceipt(res.data)
    } catch {
      // bỏ qua
    } finally {
      setLoadingPreview(false)
    }
  }

  if (!show || !item) return null

  const summary = dailyData?.summary || { totalReceipts: 0, totalQuantity: 0, totalCost: 0 }
  const items = dailyData?.items || []

  const isToday = selectedDate === getTodayYMD()
  const isYesterday = selectedDate === getYesterdayYMD()

  // Dữ liệu và thống kê cho Tab 2 (Thẻ kho toàn bộ)
  const dayTransactions = allHistory.filter((tx) => getTxDateYMD(tx.createdAt) === selectedDate)
  const baseTxs = tab2FilterMode === 'DATE' ? dayTransactions : allHistory
  const displayedTxs =
    tab2Type === 'ALL' ? baseTxs : baseTxs.filter((tx) => tx.transactionType === tab2Type)

  // Thống kê trong ngày được chọn
  const dayTotalIn = dayTransactions
    .filter((tx) => tx.transactionType === 'STOCK_IN' || tx.transactionType === 'INITIAL')
    .reduce((sum, tx) => sum + Number(tx.quantity || 0), 0)

  const dayTotalOut = dayTransactions
    .filter((tx) => tx.transactionType === 'STOCK_OUT' || tx.transactionType === 'WASTE')
    .reduce((sum, tx) => sum + Number(tx.quantity || 0), 0)

  const dayNetChange = dayTotalIn - dayTotalOut

  // Thống kê toàn bộ lịch sử
  const allTotalIn = allHistory
    .filter((tx) => tx.transactionType === 'STOCK_IN' || tx.transactionType === 'INITIAL')
    .reduce((sum, tx) => sum + Number(tx.quantity || 0), 0)

  const allTotalOut = allHistory
    .filter((tx) => tx.transactionType === 'STOCK_OUT' || tx.transactionType === 'WASTE')
    .reduce((sum, tx) => sum + Number(tx.quantity || 0), 0)

  return (
    <>
      <div className="cf-modal-backdrop" onClick={onClose} />
      <div className="cf-modal modal" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: '940px' }}>
          <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
            {/* Header Modal */}
            <div className="modal-header bg-white border-bottom py-3 px-4">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 bg-primary-subtle text-primary rounded-3">
                  <i className="bi bi-calendar2-week fs-4" />
                </div>
                <div>
                  <h5 className="modal-title fw-bold text-dark mb-0">
                    Lịch sử kho: <span className="text-primary">{item.itemName}</span>
                  </h5>
                  <div className="small text-muted mt-1 d-flex align-items-center gap-2">
                    <span>
                      Tồn hiện tại:{' '}
                      <strong className="text-dark">
                        {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Đơn vị tính: <strong className="text-secondary">{item.unit}</strong>
                    </span>
                    {item.unitCost ? (
                      <>
                        <span>•</span>
                        <span>
                          Giá vốn hiện hành:{' '}
                          <strong className="text-dark">
                            {Number(item.unitCost).toLocaleString('vi-VN')} đ/{item.unit}
                          </strong>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-close"
                aria-label="Đóng"
                onClick={onClose}
              />
            </div>

            {/* Thanh chuyển tab & Bộ lọc ngày */}
            <div className="bg-light px-4 pt-3 border-bottom">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-3">
                {/* Tabs điều hướng */}
                <div className="btn-group btn-group-sm p-1 bg-white rounded-pill border shadow-sm">
                  <button
                    type="button"
                    className={`btn rounded-pill px-3 py-1 fw-semibold ${
                      activeTab === 'DAILY' ? 'btn-primary text-white shadow-sm' : 'btn-light text-secondary'
                    }`}
                    onClick={() => setActiveTab('DAILY')}
                  >
                    <i className="bi bi-calendar-check me-1" /> Đối soát nhập kho (Theo ngày)
                  </button>
                  <button
                    type="button"
                    className={`btn rounded-pill px-3 py-1 fw-semibold ${
                      activeTab === 'ALL' ? 'btn-primary text-white shadow-sm' : 'btn-light text-secondary'
                    }`}
                    onClick={() => setActiveTab('ALL')}
                  >
                    <i className="bi bi-clock-history me-1" /> Thẻ kho toàn bộ ({allHistory.length})
                  </button>
                </div>

                {/* Bộ lọc ngày đơn lẻ (Đồng bộ tra cứu cho cả 2 Tab) */}
                <div className="d-flex align-items-center flex-wrap gap-2">
                  {/* Nút lướt ngày trước / sau */}
                  <div className="btn-group btn-group-sm shadow-sm" role="group">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-2"
                      title="Xem ngày trước"
                      onClick={() => handleDateChange(shiftDateYMD(selectedDate, -1))}
                    >
                      <i className="bi bi-chevron-left" /> Ngày trước
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-2"
                      title="Xem ngày kế tiếp"
                      onClick={() => handleDateChange(shiftDateYMD(selectedDate, 1))}
                    >
                      Ngày sau <i className="bi bi-chevron-right" />
                    </button>
                  </div>

                  {/* Input chọn đúng 1 ngày */}
                  <div className="d-flex align-items-center bg-white border rounded-3 px-2 py-1 shadow-sm">
                    <i className="bi bi-calendar3 text-primary me-2" />
                    <input
                      type="date"
                      className="form-control form-control-sm border-0 p-0 shadow-none fw-bold text-dark"
                      style={{ width: '130px', cursor: 'pointer' }}
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>

                  {/* Shortcut nhanh: Hôm nay / Hôm qua */}
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-2 py-1 ${
                        isToday ? 'btn-warning fw-bold text-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => handleDateChange(getTodayYMD())}
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-2 py-1 ${
                        isYesterday ? 'btn-warning fw-bold text-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => handleDateChange(getYesterdayYMD())}
                    >
                      Hôm qua
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Nội dung Modal */}
            <div className="modal-body p-4 bg-white" style={{ minHeight: '380px' }}>
              {activeTab === 'DAILY' ? (
                <>
                  {/* Thẻ tóm tắt số liệu trong ngày (Daily Summary Cards) */}
                  <div className="row g-3 mb-4">
                    <div className="col-sm-4">
                      <div className="card border-0 rounded-3 p-3 bg-light-subtle border border-primary-subtle shadow-xs h-100">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-circle bg-primary-subtle text-primary">
                            <i className="bi bi-receipt fs-4" />
                          </div>
                          <div>
                            <div className="small text-muted text-uppercase fw-semibold">
                              Số phiếu nhập trong ngày
                            </div>
                            <div className="fs-4 fw-bold text-dark mt-1">
                              {summary.totalReceipts}{' '}
                              <span className="fs-6 fw-normal text-muted">phiếu</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-4">
                      <div className="card border-0 rounded-3 p-3 bg-light-subtle border border-success-subtle shadow-xs h-100">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-circle bg-success-subtle text-success">
                            <i className="bi bi-box-arrow-in-down fs-4" />
                          </div>
                          <div>
                            <div className="small text-muted text-uppercase fw-semibold">
                              Tổng lượng nhập
                            </div>
                            <div className="fs-4 fw-bold text-success mt-1">
                              +{Number(summary.totalQuantity).toLocaleString('vi-VN')}{' '}
                              <span className="fs-6 fw-normal text-muted">{item.unit}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-4">
                      <div className="card border-0 rounded-3 p-3 bg-light-subtle border border-warning-subtle shadow-xs h-100">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-circle bg-warning-subtle text-warning-emphasis">
                            <i className="bi bi-cash-stack fs-4" />
                          </div>
                          <div>
                            <div className="small text-muted text-uppercase fw-semibold">
                              Tổng chi phí nhập trong ngày
                            </div>
                            <div className="fs-4 fw-bold text-danger mt-1">
                              {Number(summary.totalCost).toLocaleString('vi-VN')}{' '}
                              <span className="fs-6 fw-normal text-muted">VNĐ</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bảng chi tiết giao dịch trong ngày */}
                  {loadingDaily ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" />
                      <span>Đang tra cứu số liệu ngày {toDMY(selectedDate)}...</span>
                    </div>
                  ) : errorDaily ? (
                    <div className="alert alert-danger py-3">{errorDaily}</div>
                  ) : items.length === 0 ? (
                    /* Trạng thái rỗng (Empty State) */
                    <div className="text-center py-5 border rounded-3 bg-light my-2">
                      <i className="bi bi-inbox fs-1 text-secondary d-block mb-3" />
                      <h6 className="fw-bold text-dark mb-1">
                        Không có lượt nhập kho nào cho &quot;{item.itemName}&quot; vào ngày {toDMY(selectedDate)}
                      </h6>
                      <p className="text-muted small mb-3">
                        Quán không phát sinh phiếu nhập hàng cho nguyên liệu này trong ngày đang xem.
                      </p>
                      {!isToday && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm rounded-pill px-3"
                          onClick={() => handleDateChange(getTodayYMD())}
                        >
                          <i className="bi bi-arrow-return-left me-1" /> Về hôm nay ({toDMY(getTodayYMD())})
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Bảng 9 cột đầy đủ */
                    <div className="table-responsive border rounded-3 shadow-xs" style={{ maxHeight: '380px' }}>
                      <table className="table cf-table mb-0 align-middle">
                        <thead className="table-light sticky-top">
                          <tr className="small text-muted text-uppercase">
                            <th style={{ width: 85 }}>Giờ nhập</th>
                            <th style={{ width: 145 }}>Mã phiếu</th>
                            <th>Nhà cung cấp</th>
                            <th className="text-end" style={{ width: 110 }}>
                              SL nhập
                            </th>
                            <th className="text-end" style={{ width: 115 }}>
                              Đơn giá nhập
                            </th>
                            <th className="text-end" style={{ width: 125 }}>
                              Thành tiền
                            </th>
                            <th className="text-end" style={{ width: 125 }}>
                              Giá vốn BQ mới
                            </th>
                            <th style={{ width: 130 }}>Người thực hiện</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((row) => (
                            <tr key={row.receiptId}>
                              {/* 1. Giờ nhập */}
                              <td className="fw-semibold text-muted text-nowrap">
                                <i className="bi bi-clock me-1 text-secondary" />
                                {row.receiptTime}
                              </td>

                              {/* 2. Mã phiếu (clickable link text) */}
                              <td className="text-nowrap">
                                <button
                                  type="button"
                                  className="btn btn-link p-0 fw-bold text-primary text-decoration-none d-inline-flex align-items-center gap-1"
                                  title="Bấm để xem hóa đơn gốc"
                                  onClick={() => handleViewReceipt(row.receiptId)}
                                >
                                  <span>{row.receiptCode}</span>
                                  <i className="bi bi-box-arrow-up-right fs-8" />
                                </button>
                              </td>

                              {/* 3. Nhà cung cấp */}
                              <td>
                                <div className="fw-medium text-dark">{row.supplierName}</div>
                              </td>

                              {/* 4. Số lượng nhập */}
                              <td className="text-end fw-bold text-success text-nowrap">
                                +{Number(row.quantity).toLocaleString('vi-VN')} {item.unit}
                              </td>

                              {/* 5. Đơn giá nhập */}
                              <td className="text-end text-nowrap">
                                {Number(row.unitCost).toLocaleString('vi-VN')} đ
                              </td>

                              {/* 6. Thành tiền */}
                              <td className="text-end fw-bold text-dark text-nowrap">
                                {Number(row.subtotal).toLocaleString('vi-VN')} đ
                              </td>

                              {/* 7. Giá vốn BQ mới */}
                              <td className="text-end text-nowrap">
                                <span className="badge bg-secondary-subtle text-dark border px-2 py-1">
                                  {Number(row.newAverageCost).toLocaleString('vi-VN')} đ
                                </span>
                              </td>

                              {/* 8. Người thực hiện */}
                              <td className="small text-nowrap">
                                <div className="d-flex align-items-center gap-1">
                                  <i className="bi bi-person-circle text-secondary" />
                                  <span>{row.createdByName || '—'}</span>
                                </div>
                              </td>

                              {/* 9. Ghi chú */}
                              <td className="small text-muted fst-italic">
                                {row.note || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                /* Tab 2: Toàn bộ biến động kho (Thẻ kho) kèm kiểm tra theo ngày */
                <div>
                  {/* Thẻ tóm tắt số liệu biến động (Tab 2 Summary Cards) */}
                  <div className="row g-3 mb-3">
                    <div className="col-sm-4">
                      <div className="card border-0 rounded-3 p-3 bg-light-subtle border border-primary-subtle shadow-xs h-100">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-circle bg-primary-subtle text-primary">
                            <i className="bi bi-activity fs-4" />
                          </div>
                          <div>
                            <div className="small text-muted text-uppercase fw-semibold">
                              {tab2FilterMode === 'DATE'
                                ? `Biến động ngày ${toDMY(selectedDate)}`
                                : 'Tổng số biến động'}
                            </div>
                            <div className="fs-4 fw-bold text-dark mt-1">
                              {tab2FilterMode === 'DATE' ? dayTransactions.length : allHistory.length}{' '}
                              <span className="fs-6 fw-normal text-muted">lượt</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-4">
                      <div className="card border-0 rounded-3 p-3 bg-light-subtle border border-success-subtle shadow-xs h-100">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-circle bg-success-subtle text-success">
                            <i className="bi bi-box-arrow-in-down fs-4" />
                          </div>
                          <div>
                            <div className="small text-muted text-uppercase fw-semibold">
                              {tab2FilterMode === 'DATE' ? 'Tổng lượng nhập' : 'Tổng nhập (toàn bộ)'}
                            </div>
                            <div className="fs-4 fw-bold text-success mt-1">
                              +{Number(tab2FilterMode === 'DATE' ? dayTotalIn : allTotalIn).toLocaleString('vi-VN')}{' '}
                              <span className="fs-6 fw-normal text-muted">{item.unit}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-4">
                      <div className="card border-0 rounded-3 p-3 bg-light-subtle border border-danger-subtle shadow-xs h-100">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-circle bg-danger-subtle text-danger">
                            <i className="bi bi-box-arrow-up fs-4" />
                          </div>
                          <div>
                            <div className="small text-muted text-uppercase fw-semibold">
                              {tab2FilterMode === 'DATE' ? 'Tổng xuất & hao hụt' : 'Tổng xuất (toàn bộ)'}
                            </div>
                            <div className="fs-4 fw-bold text-danger mt-1">
                              -{Number(tab2FilterMode === 'DATE' ? dayTotalOut : allTotalOut).toLocaleString('vi-VN')}{' '}
                              <span className="fs-6 fw-normal text-muted">{item.unit}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thanh điều khiển lọc thẻ kho: Chế độ ngày & Loại giao dịch */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-2 bg-light rounded-3 mb-3 border">
                    {/* Chế độ xem: Theo ngày vs Toàn bộ */}
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-muted fw-semibold me-1">Chế độ xem:</span>
                      <div className="btn-group btn-group-sm shadow-xs" role="group">
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            tab2FilterMode === 'DATE'
                              ? 'btn-primary text-white fw-semibold'
                              : 'btn-outline-secondary'
                          }`}
                          onClick={() => setTab2FilterMode('DATE')}
                        >
                          <i className="bi bi-calendar-event me-1" />
                          Theo ngày: {toDMY(selectedDate)} ({dayTransactions.length})
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            tab2FilterMode === 'ALL'
                              ? 'btn-primary text-white fw-semibold'
                              : 'btn-outline-secondary'
                          }`}
                          onClick={() => setTab2FilterMode('ALL')}
                        >
                          <i className="bi bi-collection me-1" />
                          Toàn bộ ({allHistory.length})
                        </button>
                      </div>
                    </div>

                    {/* Lọc theo loại biến động & Badge tịnh tiến */}
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <span className="small text-muted fw-semibold">Loại:</span>
                      <div className="btn-group btn-group-sm shadow-xs" role="group">
                        {[
                          { id: 'ALL', label: 'Tất cả' },
                          { id: 'STOCK_IN', label: 'Nhập', icon: 'bi-box-arrow-in-down' },
                          { id: 'STOCK_OUT', label: 'Xuất', icon: 'bi-box-arrow-up' },
                          { id: 'WASTE', label: 'Hao hụt', icon: 'bi-trash3' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`btn btn-sm ${
                              tab2Type === t.id ? 'btn-dark fw-semibold' : 'btn-outline-secondary'
                            }`}
                            onClick={() => setTab2Type(t.id)}
                          >
                            {t.icon && <i className={`bi ${t.icon} me-1`} />}
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {tab2FilterMode === 'DATE' && (
                        <span
                          className={`badge px-2 py-1 ms-1 ${
                            dayNetChange >= 0
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : 'bg-danger-subtle text-danger border border-danger-subtle'
                          }`}
                        >
                          Tịnh tiến ngày: {dayNetChange >= 0 ? '+' : ''}
                          {Number(dayNetChange).toLocaleString('vi-VN')} {item.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bảng dữ liệu hoặc Empty State */}
                  {loadingAll ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" />
                      <span>Đang tải thẻ kho tổng hợp...</span>
                    </div>
                  ) : displayedTxs.length === 0 ? (
                    <div className="text-center py-5 border rounded-3 bg-light my-2">
                      <i className="bi bi-inbox fs-1 text-secondary d-block mb-3" />
                      <h6 className="fw-bold text-dark mb-1">
                        {tab2FilterMode === 'DATE'
                          ? `Không có biến động kho nào cho "${item.itemName}" vào ngày ${toDMY(selectedDate)}`
                          : `Không có giao dịch nào phù hợp với bộ lọc đã chọn`}
                      </h6>
                      <p className="text-muted small mb-3">
                        {tab2FilterMode === 'DATE'
                          ? 'Nguyên liệu này không phát sinh lượt nhập, xuất hoặc sự cố hao hụt nào trong ngày đang xem.'
                          : 'Hãy thử chọn loại giao dịch khác hoặc kiểm tra lại nhật ký kho.'}
                      </p>
                      <div className="d-flex justify-content-center gap-2">
                        {tab2FilterMode === 'DATE' && !isToday && (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-pill px-3"
                            onClick={() => handleDateChange(getTodayYMD())}
                          >
                            <i className="bi bi-arrow-return-left me-1" /> Về hôm nay ({toDMY(getTodayYMD())})
                          </button>
                        )}
                        {tab2FilterMode === 'DATE' && allHistory.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm rounded-pill px-3 text-white"
                            onClick={() => setTab2FilterMode('ALL')}
                          >
                            <i className="bi bi-clock-history me-1" /> Xem tất cả ({allHistory.length} giao dịch)
                          </button>
                        )}
                        {tab2Type !== 'ALL' && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                            onClick={() => setTab2Type('ALL')}
                          >
                            Xóa lọc loại biến động
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="table-responsive border rounded-3 shadow-xs" style={{ maxHeight: '380px' }}>
                      <table className="table cf-table mb-0 align-middle">
                        <thead className="table-light sticky-top">
                          <tr className="small text-muted text-uppercase">
                            <th style={{ width: 140 }}>Thời gian</th>
                            <th style={{ width: 160 }}>Loại biến động</th>
                            <th className="text-end" style={{ width: 130 }}>
                              Số lượng
                            </th>
                            <th>Lý do & Ghi chú</th>
                            <th style={{ width: 150 }}>Người thực hiện</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedTxs.map((tx) => {
                            const isPlus = tx.transactionType === 'STOCK_IN' || tx.transactionType === 'INITIAL'
                            return (
                              <tr key={tx.id}>
                                <td className="small text-muted text-nowrap">
                                  <i className="bi bi-clock me-1 text-secondary" />
                                  {tab2FilterMode === 'DATE'
                                    ? getTxTimeOnly(tx.createdAt)
                                    : formatDateTime(tx.createdAt)}
                                </td>
                                <td>
                                  {tx.transactionType === 'STOCK_IN' ? (
                                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1">
                                      <i className="bi bi-box-arrow-in-down me-1" /> Nhập kho
                                    </span>
                                  ) : tx.transactionType === 'WASTE' ? (
                                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1">
                                      <i className="bi bi-trash3 me-1" /> Hao hụt/Sự cố
                                    </span>
                                  ) : tx.transactionType === 'STOCK_OUT' ? (
                                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1">
                                      <i className="bi bi-box-arrow-up me-1" /> Xuất kho pha chế
                                    </span>
                                  ) : tx.transactionType === 'INITIAL' ? (
                                    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2 py-1">
                                      <i className="bi bi-plus-circle me-1" /> Khởi tạo kho
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary-subtle text-dark border rounded-pill px-2 py-1">
                                      {tx.transactionType}
                                    </span>
                                  )}
                                </td>
                                <td className="text-end fw-bold text-nowrap">
                                  <span className={isPlus ? 'text-success' : 'text-danger'}>
                                    {isPlus ? '+' : '-'}
                                    {Number(tx.quantity).toLocaleString('vi-VN')} {item.unit}
                                  </span>
                                </td>
                                <td className="small">
                                  <div className="fw-medium text-dark">{tx.reason || '—'}</div>
                                  {tx.note && <div className="text-muted fst-italic">{tx.note}</div>}
                                </td>
                                <td className="small text-nowrap">
                                  <i className="bi bi-person-circle me-1 text-secondary" />
                                  {tx.createdByName || 'Hệ thống'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="modal-footer bg-light border-top py-2 px-4 d-flex justify-content-between align-items-center">
              <div className="small text-muted">
                <i className="bi bi-info-circle me-1" />
                Dữ liệu được đối soát tự động từ sổ kho thời gian thực.
              </div>
              <button type="button" className="btn btn-secondary btn-sm px-3" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popup xem chi tiết hóa đơn gốc khi bấm mã phiếu */}
      {previewReceipt && (
        <>
          <div
            className="cf-modal-backdrop"
            style={{ zIndex: 1060 }}
            onClick={() => setPreviewReceipt(null)}
          />
          <div
            className="cf-modal modal"
            style={{ zIndex: 1065 }}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg border-0 rounded-4">
                <div className="modal-header border-bottom py-3">
                  <h6 className="modal-title fw-bold text-dark mb-0">
                    <i className="bi bi-receipt me-2 text-primary" />
                    Chi tiết hóa đơn gốc: {previewReceipt.receiptCode}
                  </h6>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setPreviewReceipt(null)}
                  />
                </div>
                <div className="modal-body p-3">
                  <div className="mb-2 small">
                    <span className="text-muted">Nhà cung cấp:</span>{' '}
                    <strong>{previewReceipt.supplierName}</strong>
                  </div>
                  <div className="mb-2 small">
                    <span className="text-muted">Ngày nhập:</span>{' '}
                    <strong>{previewReceipt.receiptDate}</strong> (Xác nhận lúc:{' '}
                    {previewReceipt.confirmedAt ? formatDateTime(previewReceipt.confirmedAt) : '—'})
                  </div>
                  <div className="mb-3 small">
                    <span className="text-muted">Người lập:</span>{' '}
                    <strong>{previewReceipt.createdByName || '—'}</strong>
                  </div>

                  <div className="table-responsive border rounded-2 mb-2">
                    <table className="table table-sm cf-table mb-0 align-middle">
                      <thead className="table-light small">
                        <tr>
                          <th>Nguyên liệu</th>
                          <th className="text-end">SL</th>
                          <th className="text-end">Đơn giá</th>
                          <th className="text-end">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewReceipt.items?.map((it) => (
                          <tr key={it.id}>
                            <td className="small fw-semibold">{it.itemName}</td>
                            <td className="small text-end">
                              {it.quantity} {it.unit}
                            </td>
                            <td className="small text-end">
                              {Number(it.unitCost).toLocaleString('vi-VN')} đ
                            </td>
                            <td className="small text-end fw-bold">
                              {Number(it.subtotal).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded-2">
                    <span className="small text-muted fw-semibold">Tổng giá trị phiếu:</span>
                    <span className="fw-bold text-danger fs-6">
                      {Number(previewReceipt.totalAmount).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
                <div className="modal-footer border-0 py-2">
                  <button
                    type="button"
                    className="btn btn-light-soft btn-sm"
                    onClick={() => setPreviewReceipt(null)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
