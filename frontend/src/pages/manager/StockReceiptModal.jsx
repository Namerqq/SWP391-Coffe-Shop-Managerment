import { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import stockReceiptApi from '../../api/stockReceiptApi'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

/**
 * Modal tạo mới / xem chi tiết / chỉnh sửa phiếu nhập kho.
 */
export default function StockReceiptModal({ show, receiptId, onClose, onSuccess }) {
  const toast = useToast()
  const isEditing = Boolean(receiptId)

  const [availableItems, setAvailableItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [receiptCode, setReceiptCode] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [supplierName, setSupplierName] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [items, setItems] = useState([
    { inventoryItemId: '', quantity: '', unitCost: 0, subtotal: 0 },
  ])

  // Tải danh mục nguyên liệu kho
  useEffect(() => {
    if (!show) return
    inventoryApi.list()
      .then((res) => {
        setAvailableItems(res.data)
        if (!isEditing && res.data.length > 0) {
          setItems([
            {
              inventoryItemId: String(res.data[0].id),
              quantity: 1,
              unitCost: res.data[0].unitCost || 0,
              subtotal: res.data[0].unitCost || 0,
            },
          ])
        }
      })
      .catch((err) => toast(errorMessage(err), 'error'))
  }, [show, isEditing])

  // Tải thông tin phiếu nếu là chế độ xem/sửa
  useEffect(() => {
    if (!show || !receiptId) {
      if (!isEditing) {
        setReceiptCode('')
        setStatus('DRAFT')
        setSupplierName('')
        setReceiptDate(new Date().toISOString().slice(0, 10))
        setNote('')
      }
      return
    }

    setLoading(true)
    stockReceiptApi.get(receiptId)
      .then((res) => {
        const r = res.data
        setReceiptCode(r.receiptCode)
        setStatus(r.status)
        setSupplierName(r.supplierName)
        setReceiptDate(r.receiptDate)
        setNote(r.note || '')
        setItems(
          r.items.map((i) => ({
            inventoryItemId: String(i.inventoryItemId),
            quantity: i.quantity,
            unitCost: i.unitCost,
            subtotal: i.subtotal,
          }))
        )
      })
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }, [show, receiptId])

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev]
      const row = { ...next[index], [field]: value }

      if (field === 'inventoryItemId') {
        const found = availableItems.find((a) => String(a.id) === String(value))
        if (found) {
          row.unitCost = found.unitCost || 0
        }
      }

      const q = parseFloat(row.quantity) || 0
      const c = parseInt(row.unitCost, 10) || 0
      row.subtotal = Math.round(q * c)

      next[index] = row
      return next
    })
  }

  const handleAddItem = () => {
    const first = availableItems[0]
    setItems((prev) => [
      ...prev,
      {
        inventoryItemId: first ? String(first.id) : '',
        quantity: 1,
        unitCost: first ? first.unitCost : 0,
        subtotal: first ? first.unitCost : 0,
      },
    ])
  }

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      toast('Phiếu nhập phải có ít nhất 1 nguyên liệu', 'warning')
      return
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
  const isReadOnly = isEditing && status !== 'DRAFT'

  const handleSubmit = async (confirmImmediately = false) => {
    if (!supplierName.trim()) {
      toast('Vui lòng nhập tên nhà cung cấp', 'warning')
      return
    }

    if (items.length === 0) {
      toast('Vui lòng chọn ít nhất 1 nguyên liệu', 'warning')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const row = items[i]
      if (!row.inventoryItemId) {
        toast(`Dòng ${i + 1}: Vui lòng chọn nguyên liệu`, 'warning')
        return
      }
      if (!row.quantity || parseFloat(row.quantity) <= 0) {
        toast(`Dòng ${i + 1}: Số lượng nhập phải lớn hơn 0`, 'warning')
        return
      }
    }

    const payload = {
      supplierName: supplierName.trim(),
      receiptDate,
      note: note.trim(),
      items: items.map((i) => ({
        inventoryItemId: Number(i.inventoryItemId),
        quantity: parseFloat(i.quantity),
        unitCost: parseInt(i.unitCost, 10) || 0,
      })),
    }

    setSubmitting(true)
    try {
      let saved
      if (isEditing) {
        saved = await stockReceiptApi.updateDraft(receiptId, payload)
        toast('Đã cập nhật phiếu nhập kho')
      } else {
        saved = await stockReceiptApi.createDraft(payload)
        toast('Đã tạo phiếu nhập kho nháp')
      }

      if (confirmImmediately) {
        await stockReceiptApi.confirm(saved.data.id)
        toast(`Đã xác nhận nhập kho thành công cho phiếu ${saved.data.receiptCode}! Tồn kho đã được cập nhật.`)
      }

      onSuccess?.()
      onClose?.()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      show={show}
      title={
        isEditing
          ? `Chi tiết phiếu nhập: ${receiptCode || `#${receiptId}`}`
          : 'Tạo phiếu nhập kho mới'
      }
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={submitting}>
            Đóng
          </button>
          {!isReadOnly && (
            <>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => handleSubmit(false)}
                disabled={submitting || loading}
              >
                {submitting ? 'Đang lưu...' : isEditing ? 'Lưu cập nhật' : 'Lưu nháp (DRAFT)'}
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleSubmit(true)}
                disabled={submitting || loading}
              >
                <i className="bi bi-check2-circle me-1" />
                {submitting ? 'Đang xử lý...' : 'Xác nhận nhập kho ngay'}
              </button>
            </>
          )}
        </>
      }
    >
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
          {isEditing && (
            <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
              <div>
                <span className="text-muted small">Mã phiếu: </span>
                <span className="fw-bold">{receiptCode}</span>
              </div>
              <div>
                <span className="text-muted small me-2">Trạng thái:</span>
                {status === 'RECEIVED' ? (
                  <span className="badge bg-success">ĐÃ NHẬP KHO</span>
                ) : status === 'CANCELLED' ? (
                  <span className="badge bg-secondary">ĐÃ HỦY</span>
                ) : (
                  <span className="badge bg-warning text-dark">BẢN NHÁP / CHỜ NHẬP</span>
                )}
              </div>
            </div>
          )}

          <div className="alert alert-info py-2 px-3 small d-flex align-items-center mb-3">
            <i className="bi bi-info-circle-fill fs-5 me-2 text-info" />
            <div>
              <strong>Phương pháp tính giá vốn: Bình quân gia quyền</strong>.
              Đơn giá nhập có thể linh hoạt theo từng phiếu. Khi xác nhận nhập kho, hệ thống sẽ tự động cập nhật lại đơn giá bình quân gia quyền theo số lượng tồn kho.
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-7">
              <label className="form-label fw-medium">Nhà cung cấp / Nguồn cung</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Công ty Cổ phần Cà phê Trung Nguyên"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                disabled={isReadOnly || submitting}
                required
              />
            </div>
            <div className="col-md-5">
              <label className="form-label fw-medium">Ngày nhập kho</label>
              <input
                type="date"
                className="form-control"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                disabled={isReadOnly || submitting}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Ghi chú phiếu nhập</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ghi chú thêm về lô hàng, số hóa đơn chứng từ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isReadOnly || submitting}
            />
          </div>

          <div className="border-top pt-3 mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0 fw-bold">Danh sách nguyên liệu nhập kho</h6>
              {!isReadOnly && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleAddItem}
                  disabled={submitting}
                >
                  <i className="bi bi-plus-lg me-1" /> Thêm dòng
                </button>
              )}
            </div>

            <div className="table-responsive">
              <table className="table table-bordered cf-table mb-2 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 200 }}>Nguyên liệu</th>
                    <th style={{ width: 130 }} className="text-end">Số lượng</th>
                    <th style={{ width: 170 }} className="text-end">Đơn giá nhập (đ)</th>
                    <th style={{ width: 160 }} className="text-end">Thành tiền</th>
                    {!isReadOnly && <th style={{ width: 50 }} className="text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, index) => {
                    const selectedInv = availableItems.find(
                      (a) => String(a.id) === String(row.inventoryItemId)
                    )
                    const curQty = Number(selectedInv?.currentQuantity || 0)
                    const curCost = Number(selectedInv?.unitCost || 0)
                    const inQty = parseFloat(row.quantity) || 0
                    const inCost = parseInt(row.unitCost, 10) || 0
                    let previewAvgCost = null
                    if (inQty > 0 && inCost > 0) {
                      if (curQty > 0 && curCost > 0) {
                        previewAvgCost = Math.round((curQty * curCost + inQty * inCost) / (curQty + inQty))
                      } else {
                        previewAvgCost = inCost
                      }
                    }

                    return (
                      <tr key={index}>
                        <td>
                          {isReadOnly ? (
                            <span className="fw-medium">
                              {selectedInv ? selectedInv.itemName : `Nguyên liệu #${row.inventoryItemId}`}
                            </span>
                          ) : (
                            <select
                              className="form-select form-select-sm"
                              value={row.inventoryItemId}
                              onChange={(e) =>
                                handleItemChange(index, 'inventoryItemId', e.target.value)
                              }
                              disabled={submitting}
                            >
                              {availableItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.itemName} ({inv.unit})
                                </option>
                              ))}
                            </select>
                          )}
                          {selectedInv && (
                            <div className="small text-muted mt-1">
                              Đơn vị: <strong>{selectedInv.unit}</strong> | Tồn hiện tại: <strong>{Number(selectedInv.currentQuantity).toLocaleString('vi-VN')}</strong>
                            </div>
                          )}
                        </td>
                        <td>
                          {isReadOnly ? (
                            <div className="text-end fw-semibold">
                              {Number(row.quantity).toLocaleString('vi-VN')}
                            </div>
                          ) : (
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              className="form-control form-control-sm text-end"
                              value={row.quantity}
                              onChange={(e) =>
                                handleItemChange(index, 'quantity', e.target.value)
                              }
                              disabled={submitting}
                              required
                            />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? (
                            <div className="text-end">
                              <span className="fw-semibold">{Number(row.unitCost).toLocaleString('vi-VN')} đ</span>
                            </div>
                          ) : (
                            <>
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                className="form-control form-control-sm text-end"
                                value={row.unitCost}
                                onChange={(e) =>
                                  handleItemChange(index, 'unitCost', e.target.value)
                                }
                                disabled={submitting}
                                required
                              />
                              <div className="text-end small mt-1">
                                <span className="text-muted">Giá kho cũ: {Number(curCost).toLocaleString('vi-VN')} đ</span>
                                {previewAvgCost !== null && (
                                  <div className="text-primary fw-medium" title="Đơn giá bình quân gia quyền sau khi xác nhận nhập kho">
                                    <i className="bi bi-calculator me-1" />
                                    BQ mới: ~{Number(previewAvgCost).toLocaleString('vi-VN')} đ
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="text-end fw-bold text-primary">
                          {Number(row.subtotal).toLocaleString('vi-VN')} đ
                        </td>
                        {!isReadOnly && (
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger p-1"
                              onClick={() => handleRemoveItem(index)}
                              disabled={submitting}
                              title="Xóa dòng này"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-light">
                    <td colSpan={3} className="text-end fw-bold">Tổng tiền phiếu nhập:</td>
                    <td className="text-end fw-bold fs-6 text-success">
                      {Number(totalAmount).toLocaleString('vi-VN')} đ
                    </td>
                    {!isReadOnly && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
