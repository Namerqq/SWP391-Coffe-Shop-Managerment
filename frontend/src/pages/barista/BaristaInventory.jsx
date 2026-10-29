import { useEffect, useState, useMemo } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import BaristaShortageModal from './BaristaShortageModal'
import BaristaWasteModal from './BaristaWasteModal'

/**
 * UC-B05 / UC-B06: Quản lý tồn kho quầy pha chế cho Barista.
 * Tính năng nổi bật:
 *  - Chọn hàng loạt nguyên liệu để tạo 1 phiếu đề xuất bổ sung (Batch Request)
 *  - Nút 1-click quét tự động toàn bộ nguyên liệu sắp hết / đã hết định mức an toàn
 *  - Sticky bottom action bar tiện dụng khi quầy bar đông khách
 *  - Lập biên bản sự cố hao hụt (quy trách nhiệm, tính % bồi hoàn, lưu thẻ kho)
 */
export default function BaristaInventory() {
  const toast = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'LOW' | 'ENOUGH'

  // Quản lý chọn hàng loạt (Batch Selection)
  const [selectedIds, setSelectedIds] = useState([])

  // Modals state
  const [shortageModalOpen, setShortageModalOpen] = useState(false)
  const [shortageTargetItems, setShortageTargetItems] = useState([])

  const [wasteModalOpen, setWasteModalOpen] = useState(false)
  const [wasteTargetItem, setWasteTargetItem] = useState(null)

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

  useEffect(() => {
    loadData()
  }, [])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = items.length
    const lowOrOut = items.filter(
      (i) => i.lowStock || Number(i.currentQuantity) <= (Number(i.minimumStockLevel) || 0)
    ).length
    const outOfStock = items.filter((i) => Number(i.currentQuantity) <= 0).length
    return { total, lowOrOut, outOfStock }
  }, [items])

  // Lọc danh sách hiển thị
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.itemName.toLowerCase().includes(searchTerm.trim().toLowerCase())

      const isLow =
        item.lowStock || Number(item.currentQuantity) <= (Number(item.minimumStockLevel) || 0)

      if (statusFilter === 'LOW') return matchSearch && isLow
      if (statusFilter === 'ENOUGH') return matchSearch && !isLow
      return matchSearch
    })
  }, [items, searchTerm, statusFilter])

  // Xử lý chọn Checkbox
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map((i) => i.id))
    }
  }

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Nút 1-click: Quét tự động nguyên liệu sắp hết / đã hết
  const handleAutoScanShortage = () => {
    const lowItems = items.filter(
      (i) => i.lowStock || Number(i.currentQuantity) <= (Number(i.minimumStockLevel) || 0)
    )

    if (lowItems.length === 0) {
      toast('Hiện tại tất cả nguyên liệu quầy bar đều đủ định mức an toàn!', 'info')
      return
    }

    const ids = lowItems.map((i) => i.id)
    setSelectedIds(ids)
    setShortageTargetItems(lowItems)
    setShortageModalOpen(true)
    toast(`Đã tự động quét được ${lowItems.length} nguyên liệu cần bổ sung!`, 'success')
  }

  // Mở modal báo thiếu cho 1 item riêng lẻ
  const handleOpenSingleShortage = (item) => {
    setShortageTargetItems([item])
    setShortageModalOpen(true)
  }

  // Mở modal báo thiếu cho tất cả item đã tick chọn
  const handleOpenBatchShortage = () => {
    const selected = items.filter((i) => selectedIds.includes(i.id))
    if (selected.length === 0) {
      toast('Vui lòng chọn ít nhất 1 nguyên liệu để tạo đề xuất', 'warning')
      return
    }
    setShortageTargetItems(selected)
    setShortageModalOpen(true)
  }

  // Mở modal báo sự cố hao hụt
  const handleOpenWaste = (item) => {
    setWasteTargetItem(item)
    setWasteModalOpen(true)
  }

  const isAllFilteredSelected =
    filteredItems.length > 0 && selectedIds.length >= filteredItems.length

  return (
    <div className="container-fluid py-4 pb-5">
      {/* Tiêu đề & Thống kê nhanh */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="page-title mb-0">Nguyên liệu kho quầy pha chế</h1>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-7">
              Barista Module
            </span>
          </div>
          <p className="page-subtitle text-muted mt-1 mb-0">
            Theo dõi tồn kho thời gian thực, quét đề xuất mua hàng tự động và lập biên bản sự cố hao hụt
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-light-soft btn-sm px-3 shadow-sm border"
            onClick={loadData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1" /> Làm mới
          </button>
          <button
            className="btn btn-warning btn-sm fw-semibold shadow-sm px-3"
            onClick={handleAutoScanShortage}
            disabled={loading || items.length === 0}
            title="Tự động lọc các nguyên liệu dưới định mức tối thiểu"
          >
            <i className="bi bi-lightning-charge-fill me-1 text-danger" /> Quét đề xuất tự động
            {stats.lowOrOut > 0 && (
              <span className="badge bg-danger rounded-pill ms-1">{stats.lowOrOut}</span>
            )}
          </button>
          <button
            className="btn btn-primary btn-sm fw-semibold shadow-sm px-3"
            onClick={() => {
              setShortageTargetItems(items.length > 0 ? [items[0]] : [])
              setShortageModalOpen(true)
            }}
            disabled={loading || items.length === 0}
          >
            <i className="bi bi-cart-plus me-1" /> + Tạo đề xuất bổ sung
          </button>
        </div>
      </div>

      {/* Thẻ thống kê 3 cột */}
      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-4 border-primary">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-muted text-uppercase fw-semibold">Tổng nguyên liệu quầy</div>
                <div className="fs-4 fw-bold text-dark mt-1">{stats.total} món</div>
              </div>
              <div className="p-3 bg-primary-subtle text-primary rounded-circle">
                <i className="bi bi-boxes fs-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-4">
          <div
            className={`card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-4 ${
              stats.lowOrOut > 0 ? 'border-warning' : 'border-success'
            } cursor-pointer`}
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === 'LOW' ? 'ALL' : 'LOW')}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-muted text-uppercase fw-semibold">Cần bổ sung / Sắp hết</div>
                <div className="fs-4 fw-bold text-warning-emphasis mt-1">
                  {stats.lowOrOut} món
                </div>
              </div>
              <div className="p-3 bg-warning-subtle text-warning-emphasis rounded-circle">
                <i className="bi bi-exclamation-triangle-fill fs-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-4">
          <div
            className={`card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-4 ${
              stats.outOfStock > 0 ? 'border-danger' : 'border-secondary'
            }`}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-muted text-uppercase fw-semibold">Đã cạn kiệt (Hết hàng)</div>
                <div className="fs-4 fw-bold text-danger mt-1">{stats.outOfStock} món</div>
              </div>
              <div className="p-3 bg-danger-subtle text-danger rounded-circle">
                <i className="bi bi-x-octagon-fill fs-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & Tabs lọc */}
      <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Tìm theo tên nguyên liệu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="btn btn-light border border-start-0"
                  type="button"
                  onClick={() => setSearchTerm('')}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>

          <div className="col-md-7 d-flex justify-content-md-end gap-2">
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${
                  statusFilter === 'ALL' ? 'btn-primary fw-semibold' : 'btn-outline-secondary'
                }`}
                onClick={() => setStatusFilter('ALL')}
              >
                Tất cả ({stats.total})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  statusFilter === 'LOW'
                    ? 'btn-warning fw-semibold text-dark'
                    : 'btn-outline-secondary'
                }`}
                onClick={() => setStatusFilter('LOW')}
              >
                Cần bổ sung ({stats.lowOrOut})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  statusFilter === 'ENOUGH' ? 'btn-success fw-semibold' : 'btn-outline-secondary'
                }`}
                onClick={() => setStatusFilter('ENOUGH')}
              >
                Đủ dùng ({stats.total - stats.lowOrOut})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng danh sách nguyên liệu */}
      <div className="cf-card p-0 overflow-hidden shadow-sm border rounded-3 bg-white">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
            <div className="small text-muted mt-2">Đang tải dữ liệu nguyên liệu quầy...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state py-5 text-center text-muted">
            <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary" />
            <div>Không tìm thấy nguyên liệu nào phù hợp với bộ lọc</div>
            {searchTerm && (
              <button
                className="btn btn-link btn-sm mt-1"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 45 }} className="text-center">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                      title="Chọn / Bỏ chọn tất cả"
                    />
                  </th>
                  <th>Nguyên liệu</th>
                  <th className="text-end" style={{ width: 160 }}>
                    Tồn hiện tại
                  </th>
                  <th className="text-end" style={{ width: 140 }}>
                    Định mức tối thiểu
                  </th>
                  <th className="text-center" style={{ width: 130 }}>
                    Tình trạng
                  </th>
                  <th className="text-end" style={{ width: 220 }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  const isZero = Number(item.currentQuantity) <= 0
                  const isLow =
                    item.lowStock || Number(item.currentQuantity) <= (Number(item.minimumStockLevel) || 0)

                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? 'table-warning bg-opacity-25' : ''}
                    >
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                        />
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{item.itemName}</div>
                        <div className="small text-muted">
                          Đơn vị tính: <span className="fw-medium text-secondary">{item.unit}</span>
                          {item.unitCost ? (
                            <span className="ms-2">
                              • Vốn: {Number(item.unitCost).toLocaleString('vi-VN')} đ/{item.unit}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-end">
                        <div
                          className={`fw-bold fs-6 ${
                            isZero ? 'text-danger' : isLow ? 'text-warning-emphasis' : 'text-success'
                          }`}
                        >
                          {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit}
                        </div>
                      </td>
                      <td className="text-end text-muted small">
                        {item.minimumStockLevel != null
                          ? `${Number(item.minimumStockLevel).toLocaleString('vi-VN')} ${item.unit}`
                          : '—'}
                      </td>
                      <td className="text-center">
                        {isZero ? (
                          <span className="badge bg-danger text-white rounded-pill px-2 py-1 shadow-sm fs-8">
                            <i className="bi bi-x-circle-fill me-1" /> ĐÃ HẾT
                          </span>
                        ) : isLow ? (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 fs-8">
                            <i className="bi bi-exclamation-triangle-fill me-1" /> SẮP HẾT
                          </span>
                        ) : (
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 fs-8">
                            <i className="bi bi-check-circle-fill me-1" /> ĐỦ DÙNG
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning py-1 px-2 fw-medium"
                            title="Báo thiếu nguyên liệu này"
                            onClick={() => handleOpenSingleShortage(item)}
                          >
                            <i className="bi bi-megaphone me-1" /> Báo thiếu
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2 fw-medium"
                            title="Lập biên bản sự cố / báo hao hụt"
                            onClick={() => handleOpenWaste(item)}
                          >
                            <i className="bi bi-shield-exclamation me-1" /> Báo sự cố
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar khi có nguyên liệu được tick chọn */}
      {selectedIds.length > 0 && (
        <div
          className="position-fixed bottom-0 start-50 translate-middle-x mb-4 shadow-lg p-3 rounded-pill bg-dark text-white d-flex align-items-center gap-3 border border-secondary"
          style={{ zIndex: 1050, minWidth: 380, maxWidth: '90vw' }}
        >
          <div className="d-flex align-items-center gap-2 ps-2">
            <span className="badge bg-warning text-dark rounded-circle p-2">
              <i className="bi bi-check2 fs-6 fw-bold" />
            </span>
            <span className="fw-semibold">
              Đã chọn <span className="text-warning fw-bold fs-6">{selectedIds.length}</span> nguyên liệu
            </span>
          </div>

          <div className="ms-auto d-flex align-items-center gap-2 pe-1">
            <button
              type="button"
              className="btn btn-sm btn-outline-light rounded-pill px-3"
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning text-dark fw-bold rounded-pill px-3 shadow"
              onClick={handleOpenBatchShortage}
            >
              <i className="bi bi-cart-plus-fill me-1" /> Tạo đề xuất bổ sung ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Modal Báo thiếu hàng loạt (UC-B05-Batch) */}
      <BaristaShortageModal
        show={shortageModalOpen}
        initialSelectedItems={shortageTargetItems}
        items={items}
        onClose={() => {
          setShortageModalOpen(false)
          setShortageTargetItems([])
        }}
        onSuccess={() => {
          setSelectedIds([])
          loadData()
        }}
      />

      {/* Modal Biên bản sự cố & Báo hao hụt (UC-B06-Advanced) */}
      <BaristaWasteModal
        show={wasteModalOpen}
        item={wasteTargetItem}
        onClose={() => {
          setWasteModalOpen(false)
          setWasteTargetItem(null)
        }}
        onSuccess={loadData}
      />
    </div>
  )
}
