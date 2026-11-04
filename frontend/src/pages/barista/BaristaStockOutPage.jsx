import { useEffect, useState, useMemo } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import BaristaStockOutModal from './BaristaStockOutModal'

export default function BaristaStockOutPage() {
  const toast = useToast()

  const [items, setItems] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'AVAILABLE' | 'LOW'

  // Modal State
  const [selectedItem, setSelectedItem] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.baristaList()
      setItems(res.data || [])
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await inventoryApi.baristaStockOutHistory()
      setHistory(res.data || [])
    } catch (err) {
      console.error('Không tải được lịch sử xuất kho:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    loadHistory()
  }, [])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = items.length
    const available = items.filter((i) => Number(i.currentQuantity) > 0).length
    const lowOrOut = items.filter(
      (i) => i.lowStock || Number(i.currentQuantity) <= (Number(i.minimumStockLevel) || 0)
    ).length
    return { total, available, lowOrOut }
  }, [items])

  // Lọc danh sách nguyên liệu
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.itemName.toLowerCase().includes(searchTerm.trim().toLowerCase())

      const qty = Number(item.currentQuantity) || 0
      const isLow = item.lowStock || qty <= (Number(item.minimumStockLevel) || 0)

      if (statusFilter === 'AVAILABLE') return matchSearch && qty > 0
      if (statusFilter === 'LOW') return matchSearch && isLow
      return matchSearch
    })
  }, [items, searchTerm, statusFilter])

  // Xử lý mở Modal xuất kho
  const handleOpenStockOut = (item) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  const handleStockOutSuccess = () => {
    loadData()
    loadHistory()
  }

  return (
    <div className="container-fluid py-4 pb-5">
      {/* Tiêu đề & Nút làm mới */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="page-title mb-0">Lấy nguyên liệu ra quầy bar</h1>
            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fs-7">
              Issue to Bar
            </span>
          </div>
          <p className="page-subtitle text-muted mt-1 mb-0">
            Khui bao, hộp, chai nguyên liệu từ kho đem ra quầy pha chế. Tồn kho sẽ tự động giảm và ghi nhật ký kiểm toán.
          </p>
        </div>

        <button
          className="btn btn-light btn-sm px-3 shadow-sm border d-flex align-items-center gap-1"
          onClick={() => {
            loadData()
            loadHistory()
          }}
          disabled={loading || historyLoading}
        >
          <i className="bi bi-arrow-clockwise" /> Làm mới
        </button>
      </div>

      {/* Banner hướng dẫn thao tác nhanh */}
      <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', border: '1px solid #bbf7d0' }}>
        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-md-8">
              <h5 className="fw-bold text-dark mb-2 d-flex align-items-center">
                <i className="bi bi-info-circle-fill text-primary me-2" />
                Quy trình xuất nguyên liệu quầy pha chế
              </h5>
              <div className="text-secondary small">
                Khi cần dùng nguyên liệu (như khui 1 bao cà phê 1kg, lấy 2 hộp sữa 1L, lấy 1 chai siro...):
                <ol className="mb-0 mt-2 ps-3">
                  <li>Tìm nguyên liệu trong danh sách bên dưới & bấm <strong>"Lấy ra quầy"</strong>.</li>
                  <li>Nhập số lượng thực tế đem ra quầy bar rồi bấm <strong>"Xác nhận"</strong>.</li>
                  <li>Hệ thống tự động trừ kho và ghi sổ thẻ kho cho ca của bạn.</li>
                </ol>
              </div>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="d-inline-flex flex-column gap-1 bg-white p-3 rounded-3 shadow-sm border text-start">
                <span className="small text-muted text-uppercase fw-semibold">Đã xuất hôm nay:</span>
                <span className="fs-5 fw-bold text-primary">
                  {history.length} lượt xuất
                </span>
                <span className="small text-muted">Đối soát minh bạch cuối ca</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách nguyên liệu */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 p-md-4 mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                <i className="bi bi-box-seam me-2 text-primary" />
                Danh mục nguyên liệu trong kho ({filteredItems.length})
              </h5>

              {/* Bộ lọc trạng thái */}
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${statusFilter === 'ALL' ? 'btn-primary fw-semibold' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  type="button"
                  className={`btn ${statusFilter === 'AVAILABLE' ? 'btn-success fw-semibold' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('AVAILABLE')}
                >
                  Còn hàng ({stats.available})
                </button>
                <button
                  type="button"
                  className={`btn ${statusFilter === 'LOW' ? 'btn-warning text-dark fw-semibold' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('LOW')}
                >
                  Sắp hết ({stats.lowOrOut})
                </button>
              </div>
            </div>

            {/* Ô tìm kiếm */}
            <div className="input-group mb-3">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Tìm nhanh theo tên nguyên liệu (VD: Cà phê, Sữa, Trà, Siro...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="btn btn-light border border-start-0" onClick={() => setSearchTerm('')}>
                  <i className="bi bi-x" />
                </button>
              )}
            </div>

            {/* Bảng nguyên liệu */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" />
                <div className="small text-muted mt-2">Đang tải danh sách nguyên liệu...</div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary" />
                Không tìm thấy nguyên liệu phù hợp
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tên nguyên liệu</th>
                      <th className="text-end" style={{ width: 140 }}>Tồn kho</th>
                      <th className="text-center" style={{ width: 120 }}>Tình trạng</th>
                      <th className="text-end" style={{ width: 150 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const qty = Number(item.currentQuantity) || 0
                      const isZero = qty <= 0
                      const isLow = item.lowStock || qty <= (Number(item.minimumStockLevel) || 0)

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="fw-bold text-dark">{item.itemName}</div>
                            <div className="small text-muted">
                              Đơn vị: <span className="fw-medium text-secondary">{item.unit}</span>
                            </div>
                          </td>
                          <td className="text-end">
                            <span className="fw-bold fs-6">
                              {qty.toLocaleString('vi-VN')}
                            </span>{' '}
                            <span className="small text-muted">{item.unit}</span>
                          </td>
                          <td className="text-center">
                            {isZero ? (
                              <span className="badge bg-danger text-white rounded-pill px-2 py-1 fs-8">
                                HẾT HÀNG
                              </span>
                            ) : isLow ? (
                              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 fs-8">
                                SẮP HẾT
                              </span>
                            ) : (
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 fs-8">
                                CÒN TỒN
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary px-3 fw-semibold shadow-sm"
                              onClick={() => handleOpenStockOut(item)}
                              disabled={isZero}
                            >
                              <i className="bi bi-box-arrow-up me-1" />
                              Lấy ra quầy
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Nhật ký các lần lấy nguyên liệu hôm nay */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 p-md-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                <i className="bi bi-clock-history me-2 text-success" />
                Đã xuất hôm nay
              </h5>
              <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2">
                {history.length} lần
              </span>
            </div>

            {historyLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-secondary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-5 text-muted small">
                <i className="bi bi-card-checklist fs-2 d-block mb-2 text-secondary" />
                Chưa có nguyên liệu nào được lấy ra quầy trong ngày hôm nay.
              </div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: '600px' }}>
                <div className="list-group list-group-flush">
                  {history.map((tx) => {
                    const timeStr = tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'
                    return (
                      <div key={tx.id} className="list-group-item px-0 py-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-bold text-dark">{tx.itemName}</div>
                            <div className="small text-muted mt-1">
                              {tx.note || tx.reason || 'Xuất pha chế tại quầy'}
                            </div>
                            <div className="small text-muted">
                              Bởi: <span className="fw-medium text-dark">{tx.createdByName}</span>
                            </div>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-primary rounded-pill px-2 py-1 fs-7">
                              -{Number(tx.quantity).toLocaleString('vi-VN')}
                            </span>
                            <div className="small text-muted mt-1">{timeStr}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal xuất kho */}
      <BaristaStockOutModal
        show={modalOpen}
        item={selectedItem}
        onClose={() => {
          setModalOpen(false)
          setSelectedItem(null)
        }}
        onSuccess={handleStockOutSuccess}
      />
    </div>
  )
}

