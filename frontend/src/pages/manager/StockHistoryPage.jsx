import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime } from '../../utils/format'

/**
 * UC-IV01 / GBR-09: Màn hình Sổ biến động kho tổng thể (Stock History Ledger).
 * Sổ cái bất biến ghi nhận mọi biến động nhập, xuất, hao hụt thời gian thực.
 * Cho phép lọc linh hoạt theo khoảng ngày, nguyên liệu và loại biến động.
 */

// Helper lấy ngày YYYY-MM-DD theo giờ máy
function toYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftYMD(ymd, offsetDays) {
  const parts = ymd.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  d.setDate(d.getDate() + offsetDays)
  return toYMD(d)
}

function toDMY(ymd) {
  if (!ymd) return ''
  const parts = ymd.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return ymd
}

// Xuất file CSV hỗ trợ tiếng Việt trên Excel
function exportTransactionsCSV(transactions, fromDate, toDate, selectedItemName) {
  if (!transactions || transactions.length === 0) return

  const lines = []
  lines.push('SỔ CÁI BIẾN ĐỘNG KHO (STOCK HISTORY LEDGER)')
  lines.push(`Nguyên liệu: ${selectedItemName || 'Tất cả nguyên liệu'}`)
  lines.push(`Thời gian: ${fromDate ? toDMY(fromDate) : 'Từ đầu'} đến ${toDate ? toDMY(toDate) : 'Hiện tại'}`)
  lines.push(`Thời điểm xuất file: ${new Date().toLocaleString('vi-VN')}`)
  lines.push(`Tổng số giao dịch: ${transactions.length}`)
  lines.push('')

  lines.push('Mã GD,Thời gian,Nguyên liệu,Loại biến động,Số lượng,Lý do,Ghi chú,Người thực hiện')
  for (const tx of transactions) {
    const isPlus = tx.transactionType === 'STOCK_IN' || tx.transactionType === 'INITIAL'
    const typeLabel =
      tx.transactionType === 'STOCK_IN'
        ? 'Nhập kho'
        : tx.transactionType === 'STOCK_OUT'
        ? 'Xuất kho pha chế'
        : tx.transactionType === 'WASTE'
        ? 'Hao hụt sự cố'
        : tx.transactionType === 'INITIAL'
        ? 'Khởi tạo kho'
        : tx.transactionType
    const qtyStr = `${isPlus ? '+' : '-'}${tx.quantity}`
    const timeStr = formatDateTime(tx.createdAt)
    lines.push(
      `"${tx.id}","${timeStr}","${tx.itemName || ''}","${typeLabel}","${qtyStr}","${tx.reason || ''}","${tx.note || ''}","${tx.createdByName || 'Hệ thống'}"`
    )
  }

  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SoBienDongKho_${fromDate || 'all'}_${toDate || 'all'}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function StockHistoryPage() {
  const [params, setParams] = useSearchParams()
  const today = toYMD(new Date())

  // Bộ lọc từ URL
  const fromDate = params.get('fromDate') || shiftYMD(today, -6)
  const toDate = params.get('toDate') || today
  const selectedIngredientId = params.get('ingredientId') || ''
  const selectedType = params.get('type') || 'ALL'
  const searchKeyword = params.get('q') || ''

  // State dữ liệu
  const [itemsList, setItemsList] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Tải danh mục nguyên liệu để hiển thị bộ lọc
  useEffect(() => {
    inventoryApi.list()
      .then((res) => setItemsList(res.data || []))
      .catch(() => {})
  }, [])

  // Tải danh sách giao dịch theo bộ lọc
  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const p = {}
      if (selectedIngredientId) p.ingredientId = selectedIngredientId
      if (selectedType && selectedType !== 'ALL') p.type = selectedType
      if (fromDate) p.fromDate = fromDate
      if (toDate) p.toDate = toDate

      const res = await inventoryApi.transactions(p)
      setTransactions(res.data || [])
    } catch (e) {
      setError(errorMessage(e, 'Không thể tải sổ biến động kho.'))
    } finally {
      setLoading(false)
    }
  }, [selectedIngredientId, selectedType, fromDate, toDate])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Cập nhật bộ lọc URL
  const updateFilter = (newFilters) => {
    const next = new URLSearchParams(params)
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined || (k === 'type' && v === 'ALL')) {
        next.delete(k)
      } else {
        next.set(k, v)
      }
    })
    setParams(next, { replace: true })
  }

  // Phím tắt nhanh cho khoảng ngày
  const handleQuickPreset = (preset) => {
    switch (preset) {
      case 'TODAY':
        updateFilter({ fromDate: today, toDate: today })
        break
      case 'YESTERDAY':
        updateFilter({ fromDate: shiftYMD(today, -1), toDate: shiftYMD(today, -1) })
        break
      case 'LAST_7_DAYS':
        updateFilter({ fromDate: shiftYMD(today, -6), toDate: today })
        break
      case 'LAST_30_DAYS':
        updateFilter({ fromDate: shiftYMD(today, -29), toDate: today })
        break
      case 'THIS_MONTH': {
        const d = new Date()
        const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
        updateFilter({ fromDate: firstDay, toDate: today })
        break
      }
      case 'ALL':
        updateFilter({ fromDate: '', toDate: '' })
        break
      default:
        break
    }
  }

  // Lọc thêm theo từ khóa tìm kiếm (tên nguyên liệu hoặc ghi chú / người thực hiện)
  const filteredTransactions = useMemo(() => {
    if (!searchKeyword.trim()) return transactions
    const q = searchKeyword.trim().toLowerCase()
    return transactions.filter(
      (tx) =>
        (tx.itemName && tx.itemName.toLowerCase().includes(q)) ||
        (tx.reason && tx.reason.toLowerCase().includes(q)) ||
        (tx.note && tx.note.toLowerCase().includes(q)) ||
        (tx.createdByName && tx.createdByName.toLowerCase().includes(q))
    )
  }, [transactions, searchKeyword])

  // Thống kê nhanh
  const summary = useMemo(() => {
    let inCount = 0
    let outCount = 0
    let wasteCount = 0
    let initialCount = 0

    transactions.forEach((tx) => {
      if (tx.transactionType === 'STOCK_IN') inCount++
      else if (tx.transactionType === 'STOCK_OUT') outCount++
      else if (tx.transactionType === 'WASTE') wasteCount++
      else if (tx.transactionType === 'INITIAL') initialCount++
    })

    return { total: transactions.length, inCount, outCount, wasteCount, initialCount }
  }, [transactions])

  const selectedItemObj = itemsList.find((it) => String(it.id) === String(selectedIngredientId))

  return (
    <div className="container-fluid p-0">
      {/* Header trang */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="page-title mb-0">Sổ biến động kho</h1>
            <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 small">
              UC-IV01 / GBR-09
            </span>
          </div>
          <p className="page-subtitle mb-0">
            Sổ cái bất biến (Immutable ledger) ghi nhận tất cả biến động kho thời gian thực.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link
            to="/manager/inventory"
            className="btn btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-box-seam" />
            <span>Tồn kho hiện hành</span>
          </Link>
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            onClick={() =>
              exportTransactionsCSV(
                filteredTransactions,
                fromDate,
                toDate,
                selectedItemObj ? selectedItemObj.itemName : ''
              )
            }
            disabled={filteredTransactions.length === 0}
            title="Xuất bảng kê sổ kho ra file CSV/Excel"
          >
            <i className="bi bi-file-earmark-excel text-success" />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="btn btn-light-soft d-flex align-items-center gap-1 shadow-sm"
            onClick={loadTransactions}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise" />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI thống kê lượt biến động */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <div className="cf-card stat-card h-100 shadow-xs">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="cf-muted small mb-2 text-uppercase fw-semibold">Tổng số biến động</div>
                <div className="stat-value">{summary.total.toLocaleString('vi-VN')}</div>
                <div className="small text-muted mt-1">Lượt giao dịch kho</div>
              </div>
              <span className="stat-icon text-primary bg-primary-subtle">
                <i className="bi bi-journal-text fs-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="cf-card stat-card h-100 shadow-xs">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="cf-muted small mb-2 text-uppercase fw-semibold">Lượt nhập kho</div>
                <div className="stat-value text-success">{summary.inCount.toLocaleString('vi-VN')}</div>
                <div className="small text-muted mt-1">Phiếu nhập kho đã xác nhận</div>
              </div>
              <span className="stat-icon text-success bg-success-subtle">
                <i className="bi bi-box-arrow-in-down fs-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="cf-card stat-card h-100 shadow-xs">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="cf-muted small mb-2 text-uppercase fw-semibold">Lượt xuất pha chế</div>
                <div className="stat-value text-warning-emphasis">{summary.outCount.toLocaleString('vi-VN')}</div>
                <div className="small text-muted mt-1">Xuất quầy & tiêu hao pha chế</div>
              </div>
              <span className="stat-icon text-warning bg-warning-subtle">
                <i className="bi bi-box-arrow-up fs-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="cf-card stat-card h-100 shadow-xs">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="cf-muted small mb-2 text-uppercase fw-semibold">Lượt hao hụt / Sự cố</div>
                <div className="stat-value text-danger">{summary.wasteCount.toLocaleString('vi-VN')}</div>
                <div className="small text-muted mt-1">Hư hỏng, đổ vỡ, hết hạn</div>
              </div>
              <span className="stat-icon text-danger bg-danger-subtle">
                <i className="bi bi-trash3 fs-4" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh bộ lọc tổng hợp (GBR-09: filter by date range, material, and transaction type) */}
      <div className="cf-card p-3 mb-3 shadow-xs">
        <div className="row g-3 align-items-end">
          {/* 1. Lọc theo khoảng ngày */}
          <div className="col-12 col-lg-5">
            <div className="small fw-semibold text-muted mb-2">Khoảng thời gian:</div>
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted">Từ:</span>
                <input
                  type="date"
                  className="form-control form-control-sm shadow-none"
                  style={{ width: '135px' }}
                  value={fromDate}
                  max={toDate || today}
                  onChange={(e) => updateFilter({ fromDate: e.target.value })}
                />
              </div>
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted">Đến:</span>
                <input
                  type="date"
                  className="form-control form-control-sm shadow-none"
                  style={{ width: '135px' }}
                  value={toDate}
                  min={fromDate}
                  max={today}
                  onChange={(e) => updateFilter({ toDate: e.target.value })}
                />
              </div>
            </div>

            {/* Phím tắt nhanh */}
            <div className="d-flex flex-wrap gap-1">
              <button
                type="button"
                className={`rv-quick-btn ${fromDate === today && toDate === today ? 'active' : ''}`}
                onClick={() => handleQuickPreset('TODAY')}
              >
                Hôm nay
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${fromDate === shiftYMD(today, -1) && toDate === shiftYMD(today, -1) ? 'active' : ''}`}
                onClick={() => handleQuickPreset('YESTERDAY')}
              >
                Hôm qua
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${fromDate === shiftYMD(today, -6) && toDate === today ? 'active' : ''}`}
                onClick={() => handleQuickPreset('LAST_7_DAYS')}
              >
                7 ngày qua
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${fromDate === shiftYMD(today, -29) && toDate === today ? 'active' : ''}`}
                onClick={() => handleQuickPreset('LAST_30_DAYS')}
              >
                30 ngày qua
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${fromDate === '' && toDate === '' ? 'active' : ''}`}
                onClick={() => handleQuickPreset('ALL')}
              >
                Tất cả ngày
              </button>
            </div>
          </div>

          {/* 2. Lọc theo nguyên liệu */}
          <div className="col-12 col-md-6 col-lg-3">
            <label className="small fw-semibold text-muted mb-2 d-block">Nguyên liệu:</label>
            <select
              className="form-select form-select-sm shadow-none"
              value={selectedIngredientId}
              onChange={(e) => updateFilter({ ingredientId: e.target.value })}
            >
              <option value="">— Tất cả nguyên liệu ({itemsList.length}) —</option>
              {itemsList.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.itemName} ({it.unit})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lọc theo loại biến động */}
          <div className="col-12 col-md-6 col-lg-4">
            <label className="small fw-semibold text-muted mb-2 d-block">Loại biến động:</label>
            <div className="btn-group btn-group-sm w-100 shadow-xs" role="group">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'STOCK_IN', label: 'Nhập kho', icon: 'bi-box-arrow-in-down' },
                { id: 'STOCK_OUT', label: 'Xuất pha chế', icon: 'bi-box-arrow-up' },
                { id: 'WASTE', label: 'Hao hụt', icon: 'bi-trash3' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`btn btn-sm ${
                    selectedType === t.id ? 'btn-primary text-white fw-semibold' : 'btn-outline-secondary'
                  }`}
                  onClick={() => updateFilter({ type: t.id })}
                >
                  {t.icon && <i className={`bi ${t.icon} me-1`} />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm nhanh từ khóa */}
        <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '420px' }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 shadow-none ps-0"
                placeholder="Tìm theo tên nguyên liệu, lý do, người làm..."
                value={searchKeyword}
                onChange={(e) => updateFilter({ q: e.target.value })}
              />
              {searchKeyword && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => updateFilter({ q: '' })}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>

          <div className="small text-muted">
            Hiển thị <strong className="text-dark">{filteredTransactions.length}</strong> / {transactions.length} giao dịch
          </div>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Bảng sổ cái biến động kho */}
      <div className="cf-card p-0 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary spinner-border-sm me-2" />
            <span>Đang tải sổ biến động kho...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-journal-x fs-1 text-secondary d-block mb-3" />
            <h6 className="fw-bold text-dark mb-1">Không tìm thấy biến động kho nào</h6>
            <p className="text-muted small mb-3">
              Không có giao dịch nào khớp với bộ lọc thời gian hoặc điều kiện đã chọn.
            </p>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm rounded-pill px-3"
              onClick={() => updateFilter({ fromDate: shiftYMD(today, -29), toDate: today, ingredientId: '', type: 'ALL', q: '' })}
            >
              Xem 30 ngày qua cho tất cả
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th style={{ width: 80 }}>Mã GD</th>
                  <th style={{ width: 155 }}>Thời gian</th>
                  <th>Nguyên liệu</th>
                  <th style={{ width: 170 }}>Loại biến động</th>
                  <th className="text-end" style={{ width: 130 }}>
                    Số lượng
                  </th>
                  <th>Lý do &amp; Ghi chú</th>
                  <th style={{ width: 160 }}>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const isPlus = tx.transactionType === 'STOCK_IN' || tx.transactionType === 'INITIAL'
                  return (
                    <tr key={tx.id}>
                      {/* Mã GD */}
                      <td className="small text-muted fw-semibold">
                        #{tx.id}
                      </td>

                      {/* Thời gian */}
                      <td className="small text-muted text-nowrap">
                        <i className="bi bi-clock me-1 text-secondary" />
                        {formatDateTime(tx.createdAt)}
                      </td>

                      {/* Nguyên liệu */}
                      <td>
                        <span className="fw-semibold text-dark">{tx.itemName}</span>
                      </td>

                      {/* Loại biến động */}
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

                      {/* Số lượng */}
                      <td className="text-end fw-bold text-nowrap">
                        <span className={isPlus ? 'text-success' : 'text-danger'}>
                          {isPlus ? '+' : '-'}
                          {Number(tx.quantity).toLocaleString('vi-VN')}
                        </span>
                      </td>

                      {/* Lý do & Ghi chú */}
                      <td className="small">
                        <div className="fw-medium text-dark">{tx.reason || '—'}</div>
                        {tx.note && <div className="text-muted fst-italic">{tx.note}</div>}
                      </td>

                      {/* Người thực hiện */}
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
    </div>
  )
}
