import { useEffect, useState, useMemo } from 'react'
import stockReceiptApi from '../../api/stockReceiptApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import StockReceiptModal from './StockReceiptModal'
import ConfirmModal from '../../components/ConfirmModal'

/**
 * UC-IV02, UC-IV03, UC-IV04: Quản lý Phiếu nhập kho & Yêu cầu bổ sung nguyên liệu.
 */
export default function StockReceiptList() {
  const toast = useToast()

  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ALL') // ALL, DRAFT, RECEIVED, CANCELLED
  const [keyword, setKeyword] = useState('')

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReceiptId, setSelectedReceiptId] = useState(null)

  // Confirm / Cancel action states
  const [confirmingReceipt, setConfirmingReceipt] = useState(null)
  const [cancellingReceipt, setCancellingReceipt] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await stockReceiptApi.list({
        status: tab !== 'ALL' ? tab : undefined,
        keyword: keyword.trim() || undefined,
      })
      setReceipts(res.data)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tab])

  const handleSearch = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleOpenCreate = () => {
    setSelectedReceiptId(null)
    setModalOpen(true)
  }

  const handleOpenDetail = (id) => {
    setSelectedReceiptId(id)
    setModalOpen(true)
  }

  // Xác nhận nhập kho
  const handleConfirmReceipt = async () => {
    if (!confirmingReceipt) return
    setActionBusy(true)
    try {
      await stockReceiptApi.confirm(confirmingReceipt.id)
      toast(`Đã xác nhận nhập kho thành công cho phiếu ${confirmingReceipt.receiptCode}! Số lượng và đơn giá bình quân gia quyền đã được cập nhật vào kho.`)
      loadData()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setActionBusy(false)
      setConfirmingReceipt(null)
    }
  }

  // Hủy phiếu nhập kho
  const handleCancelReceipt = async () => {
    if (!cancellingReceipt) return
    setActionBusy(true)
    try {
      await stockReceiptApi.cancel(cancellingReceipt.id, { reason: 'Quản lý hủy phiếu' })
      toast(`Đã hủy phiếu ${cancellingReceipt.receiptCode}`)
      loadData()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setActionBusy(false)
      setCancellingReceipt(null)
    }
  }

  const draftCount = useMemo(
    () => receipts.filter((r) => r.status === 'DRAFT').length,
    [receipts]
  )

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="page-title">Phiếu nhập kho & Yêu cầu bổ sung</h1>
          <p className="page-subtitle">
            Quản lý nhập hàng từ nhà cung cấp và duyệt yêu cầu bổ sung nguyên liệu từ quầy pha chế
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-light-soft btn-sm" onClick={loadData} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1" /> Làm mới
          </button>
          <button className="btn btn-primary btn-sm fw-medium shadow-sm" onClick={handleOpenCreate}>
            <i className="bi bi-plus-lg me-1" /> Tạo phiếu nhập mới
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <ul className="nav nav-pills cf-filter-pills">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'ALL' ? 'active' : ''}`}
              onClick={() => setTab('ALL')}
            >
              Tất cả ({receipts.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'DRAFT' ? 'active' : ''}`}
              onClick={() => setTab('DRAFT')}
            >
              Chờ duyệt / Nháp
              {draftCount > 0 && tab !== 'DRAFT' && (
                <span className="badge bg-warning text-dark ms-1">{draftCount}</span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'RECEIVED' ? 'active' : ''}`}
              onClick={() => setTab('RECEIVED')}
            >
              Đã nhập kho
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'CANCELLED' ? 'active' : ''}`}
              onClick={() => setTab('CANCELLED')}
            >
              Đã hủy
            </button>
          </li>
        </ul>

        <form onSubmit={handleSearch} className="d-flex gap-2">
          <div className="input-group input-group-sm" style={{ width: 260 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Mã phiếu, nhà cung cấp..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-sm btn-outline-secondary">
            Tìm
          </button>
        </form>
      </div>

      {/* Receipts Table */}
      <div className="cf-card p-0 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : receipts.length === 0 ? (
          <div className="empty-state py-5">
            <i className="bi bi-file-earmark-text fs-1 text-muted" />
            <div className="mt-2 text-muted">Không có phiếu nhập kho nào phù hợp</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Nhà cung cấp / Nguồn</th>
                  <th>Ngày nhập</th>
                  <th className="text-end">Tổng tiền</th>
                  <th className="text-center">Trạng thái</th>
                  <th>Người tạo</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => {
                  const isShortageReq = r.receiptCode?.startsWith('YC-')
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold font-monospace text-primary">
                            {r.receiptCode}
                          </span>
                          {isShortageReq && (
                            <span className="badge bg-info-subtle text-info border border-info-subtle px-1">
                              Báo thiếu
                            </span>
                          )}
                        </div>
                        {r.note && (
                          <div className="small text-muted text-truncate" style={{ maxWidth: 220 }}>
                            {r.note}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{r.supplierName}</div>
                      </td>
                      <td>
                        <div>{r.receiptDate}</div>
                      </td>
                      <td className="text-end fw-bold text-success">
                        {Number(r.totalAmount).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="text-center">
                        {r.status === 'RECEIVED' ? (
                          <span className="cf-badge badge-active">Đã nhập kho</span>
                        ) : r.status === 'CANCELLED' ? (
                          <span className="cf-badge badge-inactive">Đã hủy</span>
                        ) : (
                          <span className="cf-badge badge-locked">Bản nháp / Chờ duyệt</span>
                        )}
                      </td>
                      <td>
                        <div className="small fw-medium">{r.createdByName}</div>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light-soft py-1 px-2"
                            onClick={() => handleOpenDetail(r.id)}
                            title="Xem / Sửa phiếu"
                          >
                            <i className="bi bi-eye me-1" />
                            {r.status === 'DRAFT' ? 'Sửa' : 'Xem'}
                          </button>

                          {r.status === 'DRAFT' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success py-1 px-2"
                                onClick={() => setConfirmingReceipt(r)}
                                title="Xác nhận nhập kho và cộng tồn"
                              >
                                <i className="bi bi-check2-circle me-1" /> Nhập kho
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-1 px-2"
                                onClick={() => setCancellingReceipt(r)}
                                title="Hủy phiếu nhập"
                              >
                                <i className="bi bi-x-circle" />
                              </button>
                            </>
                          )}
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

      {/* Modal Tạo/Sửa phiếu nhập */}
      <StockReceiptModal
        show={modalOpen}
        receiptId={selectedReceiptId}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal xác nhận nhập kho */}
      <ConfirmModal
        show={Boolean(confirmingReceipt)}
        title="Xác nhận nhập kho"
        message={
          confirmingReceipt
            ? `Bạn có chắc chắn muốn xác nhận nhập kho cho phiếu ${confirmingReceipt.receiptCode}? Hệ thống sẽ cộng dồn số lượng vào tồn kho và tự động tính lại đơn giá bình quân gia quyền cho các nguyên liệu.`
            : ''
        }
        confirmText={actionBusy ? 'Đang xử lý...' : 'Xác nhận nhập'}
        tone="success"
        onConfirm={handleConfirmReceipt}
        onClose={() => setConfirmingReceipt(null)}
      />

      {/* Modal xác nhận hủy phiếu */}
      <ConfirmModal
        show={Boolean(cancellingReceipt)}
        title="Hủy phiếu nhập kho"
        message={
          cancellingReceipt
            ? `Bạn có chắc chắn muốn hủy phiếu ${cancellingReceipt.receiptCode}? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText={actionBusy ? 'Đang hủy...' : 'Đồng ý hủy'}
        tone="danger"
        onConfirm={handleCancelReceipt}
        onClose={() => setCancellingReceipt(null)}
      />
    </div>
  )
}
