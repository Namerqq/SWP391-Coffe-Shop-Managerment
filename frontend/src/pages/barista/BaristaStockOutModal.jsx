import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

export default function BaristaStockOutModal({ show, onClose, onSuccess, item }) {
  const toast = useToast()

  const [quantity, setQuantity] = useState('')
  const [reasonType, setReasonType] = useState('STOCK_OUT')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show) {
      setQuantity('')
      setReasonType('STOCK_OUT')
      setNote('')
    }
  }, [show])

  if (!show || !item) return null

  const currentQty = Number(item.currentQuantity) || 0
  const reduceQty = Number(quantity) || 0
  const previewQty = currentQty - reduceQty

  // Thêm nhanh số lượng
  const handleAddQty = (amount) => {
    const nextVal = (Number(quantity) || 0) + amount
    if (nextVal > currentQty) {
      setQuantity(String(currentQty))
    } else {
      setQuantity(String(Number(nextVal.toFixed(3))))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quantity || reduceQty <= 0) {
      toast('Số lượng xuất dùng phải lớn hơn 0', 'error')
      return
    }

    if (reduceQty > currentQty) {
      toast(`Số lượng xuất (${reduceQty} ${item.unit}) vượt quá tồn hiện tại (${currentQty} ${item.unit})!`, 'error')
      return
    }

    setLoading(true)
    try {
      await inventoryApi.baristaStockOut(item.id, {
        quantity: reduceQty,
        reasonType,
        note: note.trim() || 'Xuất sử dụng tại quầy pha chế'
      })
      toast(`Đã lấy ${reduceQty} ${item.unit} ${item.itemName} ra quầy bar thành công!`, 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="cf-modal-backdrop" onClick={onClose} />
      <div className="cf-modal modal" tabIndex="-1" style={{ display: 'block' }}>
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content shadow border-0 rounded-4" onSubmit={handleSubmit}>
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold text-primary d-flex align-items-center">
                <i className="bi bi-box-arrow-up me-2 fs-5" />
                Lấy nguyên liệu ra quầy: {item.itemName}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={loading} />
            </div>

            <div className="modal-body py-3">
              {/* Box Preview Tồn Kho */}
              <div className="p-3 mb-3 rounded-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Tồn kho hiện có trong kho:</span>
                  <span className="fw-bold fs-6 text-dark">{currentQty.toLocaleString('vi-VN')} {item.unit}</span>
                </div>
                {reduceQty > 0 && (
                  <div className="d-flex justify-content-between pt-2 border-top border-success-subtle">
                    <span className="text-muted small">Tồn dự kiến sau khi lấy:</span>
                    <span className={`fw-bold fs-6 ${previewQty < 0 ? 'text-danger' : 'text-success'}`}>
                      {previewQty.toLocaleString('vi-VN')} {item.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Mục đích / Lý do xuất */}
              <div className="mb-3">
                <label className="form-label fw-bold small text-secondary">
                  Mục đích sử dụng <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-select-md"
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value)}
                  required
                >
                  <option value="STOCK_OUT">Khui bao / hộp sử dụng pha chế tại quầy bar</option>
                  <option value="ADJUSTMENT">Cân chỉnh hao hụt / kiểm kê ca</option>
                  <option value="WASTE">Hao hụt sự cố / Hết hạn</option>
                </select>
              </div>

              {/* Số lượng xuất */}
              <div className="mb-3">
                <label className="form-label fw-bold small text-secondary">
                  Số lượng lấy ra quầy ({item.unit}) <span className="text-danger">*</span>
                </label>
                <div className="input-group input-group-lg mb-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    max={currentQty}
                    className="form-control"
                    placeholder="Nhập số lượng..."
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className="input-group-text bg-light fw-bold text-secondary">{item.unit}</span>
                </div>

                {/* Quick Add Chips */}
                <div className="d-flex flex-wrap gap-2 pt-1">
                  <span className="small text-muted align-self-center me-1">Chọn nhanh:</span>
                  <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => handleAddQty(0.5)}>
                    +0.5
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => handleAddQty(1)}>
                    +1
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => handleAddQty(2)}>
                    +2
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => handleAddQty(5)}>
                    +5
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2" onClick={() => setQuantity(String(currentQty))}>
                    Lấy hết ({currentQty})
                  </button>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="mb-2">
                <label className="form-label fw-bold small text-muted">Ghi chú ca làm việc (Tùy chọn)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Khui bao phục vụ ca sáng, bổ sung tủ mát..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light px-4" onClick={onClose} disabled={loading}>
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4 fw-bold shadow-sm"
                disabled={loading || !quantity || reduceQty <= 0 || reduceQty > currentQty}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Đang xuất kho...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2 me-1" />
                    Xác nhận lấy ra quầy
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

