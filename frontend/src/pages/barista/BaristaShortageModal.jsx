import { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import baristaApi from '../../api/baristaApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

/**
 * UC-B05-Batch: Barista báo thiếu hàng loạt & tạo đề xuất bổ sung nguyên liệu.
 * Gom nhiều nguyên liệu vào 1 phiếu DRAFT (YC-...) gửi Quản lý duyệt.
 */
export default function BaristaShortageModal({
  show,
  initialSelectedItems = [],
  items = [],
  onClose,
  onSuccess,
}) {
  const toast = useToast()

  const [shortageList, setShortageList] = useState([])
  const [overallPriority, setOverallPriority] = useState('NORMAL')
  const [generalNote, setGeneralNote] = useState('')
  const [extraItemId, setExtraItemId] = useState('')
  const [loading, setLoading] = useState(false)

  // Gợi ý số lượng bổ sung thông minh dựa trên định mức tồn tối thiểu
  const calcSuggestedQty = (item) => {
    const cur = Number(item.currentQuantity) || 0
    const min = Number(item.minimumStockLevel) || 5
    if (cur < min) {
      const diff = Math.max(min * 2 - cur, min)
      return Math.round(diff * 10) / 10
    }
    return min || 5
  }

  useEffect(() => {
    if (show) {
      let initialList = []
      if (Array.isArray(initialSelectedItems) && initialSelectedItems.length > 0) {
        initialList = initialSelectedItems
      } else if (initialSelectedItems && typeof initialSelectedItems === 'object') {
        initialList = [initialSelectedItems]
      }

      const formatted = initialList.map((item) => ({
        inventoryItemId: item.id,
        itemName: item.itemName,
        unit: item.unit,
        currentQuantity: item.currentQuantity,
        minimumStockLevel: item.minimumStockLevel,
        requestedQuantity: calcSuggestedQty(item),
        itemPriority: item.lowStock || Number(item.currentQuantity) <= 0 ? 'URGENT' : 'NORMAL',
        note: '',
      }))

      // Nếu có ít nhất 1 item khẩn cấp thì set overallPriority là URGENT
      const hasUrgent = formatted.some((i) => i.itemPriority === 'URGENT')
      setOverallPriority(hasUrgent ? 'URGENT' : 'NORMAL')
      setShortageList(formatted)
      setGeneralNote('')
      setExtraItemId('')
    }
  }, [show, initialSelectedItems])

  const handleUpdateItem = (index, field, value) => {
    setShortageList((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveItem = (index) => {
    setShortageList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddExtraItem = () => {
    if (!extraItemId) return
    const found = items.find((i) => String(i.id) === String(extraItemId))
    if (!found) return

    if (shortageList.some((i) => i.inventoryItemId === found.id)) {
      toast(`Nguyên liệu "${found.itemName}" đã có trong danh sách đề xuất.`, 'warning')
      return
    }

    setShortageList((prev) => [
      ...prev,
      {
        inventoryItemId: found.id,
        itemName: found.itemName,
        unit: found.unit,
        currentQuantity: found.currentQuantity,
        minimumStockLevel: found.minimumStockLevel,
        requestedQuantity: calcSuggestedQty(found),
        itemPriority: 'NORMAL',
        note: '',
      },
    ])
    setExtraItemId('')
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (shortageList.length === 0) {
      toast('Vui lòng chọn ít nhất 1 nguyên liệu cần bổ sung', 'warning')
      return
    }

    // Kiểm tra số lượng hợp lệ
    for (const row of shortageList) {
      const qty = parseFloat(row.requestedQuantity)
      if (!qty || qty <= 0) {
        toast(`Vui lòng nhập số lượng hợp lệ cho "${row.itemName}"`, 'warning')
        return
      }
    }

    setLoading(true)
    try {
      const payload = {
        priority: overallPriority,
        note: generalNote.trim(),
        items: shortageList.map((row) => ({
          inventoryItemId: row.inventoryItemId,
          requestedQuantity: parseFloat(row.requestedQuantity),
          itemPriority: row.itemPriority,
          note: row.note?.trim() || null,
        })),
      }

      await baristaApi.reportShortageBatch(payload)
      toast(`Đã gửi đề xuất bổ sung (${shortageList.length} nguyên liệu) tới Quản lý thành công!`, 'success')
      onSuccess?.()
      onClose?.()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const availableToAdd = items.filter(
    (item) => !shortageList.some((s) => s.inventoryItemId === item.id)
  )

  return (
    <Modal
      show={show}
      title={
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-cart-plus text-warning" />
          <span>Đề xuất bổ sung nguyên liệu kho quầy</span>
          <span className="badge bg-warning text-dark rounded-pill fs-7 ms-1">
            {shortageList.length} món
          </span>
        </div>
      }
      size="lg"
      onClose={onClose}
      footer={
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="small text-muted">
            <i className="bi bi-info-circle me-1" />
            Tạo 1 phiếu yêu cầu dạng <strong>DRAFT</strong> gửi quản lý đối soát và nhập kho.
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-light-soft btn-sm"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="btn btn-warning btn-sm fw-semibold shadow-sm"
              onClick={handleSubmit}
              disabled={loading || shortageList.length === 0}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" /> Đang gửi...
                </>
              ) : (
                <>
                  <i className="bi bi-send-check me-1" /> Gửi đề xuất ({shortageList.length})
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Mức độ ưu tiên tổng & Ghi chú chung */}
        <div className="card border-0 bg-light-subtle rounded-3 p-3 mb-3 border">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <label className="form-label small fw-semibold text-muted mb-1 text-uppercase">
                Mức độ ưu tiên phiếu
              </label>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 ${
                    overallPriority === 'NORMAL'
                      ? 'btn-outline-primary active fw-bold bg-primary text-white'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => setOverallPriority('NORMAL')}
                >
                  <i className="bi bi-clock-history" /> Thường
                </button>
                <button
                  type="button"
                  className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 ${
                    overallPriority === 'URGENT'
                      ? 'btn-danger active fw-bold'
                      : 'btn-outline-danger'
                  }`}
                  onClick={() => setOverallPriority('URGENT')}
                >
                  <i className="bi bi-lightning-charge-fill" /> Khẩn cấp
                </button>
              </div>
            </div>

            <div className="col-md-7">
              <label className="form-label small fw-semibold text-muted mb-1 text-uppercase">
                Lý do / Ca làm việc
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Ví dụ: Đông khách đột biến ca tối, bổ sung trước giờ cao điểm..."
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Danh sách nguyên liệu cần bổ sung */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-semibold text-dark small text-uppercase">
            Danh sách nguyên liệu đề xuất ({shortageList.length})
          </span>
          {availableToAdd.length > 0 && (
            <div className="d-flex gap-1" style={{ maxWidth: 300 }}>
              <select
                className="form-select form-select-sm"
                value={extraItemId}
                onChange={(e) => setExtraItemId(e.target.value)}
              >
                <option value="">+ Chọn thêm nguyên liệu khác...</option>
                {availableToAdd.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.itemName} (tồn: {i.currentQuantity} {i.unit})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-2"
                onClick={handleAddExtraItem}
                disabled={!extraItemId}
                title="Thêm vào danh sách đề xuất"
              >
                Thêm
              </button>
            </div>
          )}
        </div>

        {shortageList.length === 0 ? (
          <div className="text-center py-4 border rounded-3 bg-light text-muted small">
            <i className="bi bi-inbox fs-3 d-block mb-1 text-secondary" />
            Chưa có nguyên liệu nào được chọn. Hãy chọn từ danh mục quầy hoặc chọn ở trên.
          </div>
        ) : (
          <div className="table-responsive border rounded-3 mb-3 bg-white" style={{ maxHeight: 320 }}>
            <table className="table table-sm cf-table mb-0 align-middle">
              <thead className="table-light sticky-top">
                <tr className="small text-muted">
                  <th style={{ width: 30 }}>#</th>
                  <th>Nguyên liệu</th>
                  <th className="text-center" style={{ width: 110 }}>Tồn kho</th>
                  <th style={{ width: 150 }}>SL đề xuất</th>
                  <th style={{ width: 110 }}>Ưu tiên</th>
                  <th style={{ width: 40 }} className="text-center">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {shortageList.map((row, idx) => {
                  const isLow = Number(row.currentQuantity) <= (Number(row.minimumStockLevel) || 0)
                  const isZero = Number(row.currentQuantity) <= 0
                  return (
                    <tr key={row.inventoryItemId}>
                      <td className="text-muted small">{idx + 1}</td>
                      <td>
                        <div className="fw-semibold text-dark">{row.itemName}</div>
                        <div className="small text-muted">Đơn vị: {row.unit}</div>
                      </td>
                      <td className="text-center">
                        <div
                          className={`fw-bold small ${
                            isZero ? 'text-danger' : isLow ? 'text-warning-emphasis' : 'text-success'
                          }`}
                        >
                          {Number(row.currentQuantity).toLocaleString('vi-VN')} {row.unit}
                        </div>
                        {isZero ? (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill py-0 px-1 fs-8">
                            Hết hàng
                          </span>
                        ) : isLow ? (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill py-0 px-1 fs-8">
                            Sắp hết
                          </span>
                        ) : (
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill py-0 px-1 fs-8">
                            Đủ dùng
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="input-group input-group-sm">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="form-control fw-bold text-primary"
                            value={row.requestedQuantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'requestedQuantity', e.target.value)
                            }
                            required
                          />
                          <span className="input-group-text small text-muted px-2">
                            {row.unit}
                          </span>
                        </div>
                      </td>
                      <td>
                        <select
                          className={`form-select form-select-sm small ${
                            row.itemPriority === 'URGENT'
                              ? 'border-danger text-danger fw-semibold'
                              : 'text-secondary'
                          }`}
                          value={row.itemPriority}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'itemPriority', e.target.value)
                          }
                        >
                          <option value="NORMAL">Bình thường</option>
                          <option value="URGENT">Khẩn cấp</option>
                        </select>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-link text-danger p-0"
                          title="Loại khỏi phiếu"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <i className="bi bi-x-circle fs-6" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </form>
    </Modal>
  )
}
