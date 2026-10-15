import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

export default function StockOutModal({ show, onClose, onSuccess, item }) {
  const toast = useToast()
  
  const [quantity, setQuantity] = useState('')
  const [reasonType, setReasonType] = useState('ADJUSTMENT')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show) {
      setQuantity('')
      setReasonType('ADJUSTMENT')
      setNote('')
    }
  }, [show])

  if (!show || !item) return null

  const currentQty = Number(item.currentQuantity) || 0
  const reduceQty = Number(quantity) || 0
  const previewQty = currentQty - reduceQty

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quantity || reduceQty <= 0) {
      toast('Số lượng giảm phải lớn hơn 0', 'error')
      return
    }

    if (reduceQty > currentQty) {
      toast(`Số lượng giảm (${reduceQty}) vượt quá tồn hiện tại (${currentQty} ${item.unit})`, 'error')
      return
    }
    
    setLoading(true)
    try {
      await inventoryApi.stockOut(item.id, {
        quantity: reduceQty,
        reasonType,
        note: note.trim()
      })
      toast(`Giảm kho ${item.itemName} thành công`, 'success')
      onSuccess()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="cf-modal-backdrop" onClick={onClose} />
      <div className="cf-modal modal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title text-warning-emphasis">
                <i className="bi bi-dash-circle me-2" />
                Xuất / Giảm kho: {item.itemName}
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="p-3 mb-3 rounded-3" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Tồn kho hiện tại:</span>
                  <span className="fw-bold">{currentQty.toLocaleString('vi-VN')} {item.unit}</span>
                </div>
                {reduceQty > 0 && (
                  <div className="d-flex justify-content-between pt-1 border-top border-warning-subtle">
                    <span className="text-muted small">Dự kiến sau khi giảm:</span>
                    <span className={`fw-bold ${previewQty < 0 ? 'text-danger' : 'text-success'}`}>
                      {previewQty.toLocaleString('vi-VN')} {item.unit}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Lý do giảm <span className="text-danger">*</span></label>
                <select 
                  className="form-select"
                  value={reasonType}
                  onChange={e => setReasonType(e.target.value)}
                  required
                >
                  <option value="ADJUSTMENT">Cân chỉnh do nhập nhầm số lượng</option>
                  <option value="WASTE">Hao hụt / Hư hỏng / Hết hạn</option>
                  <option value="STOCK_OUT">Xuất kho sử dụng khác</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Số lượng giảm ({item.unit}) <span className="text-danger">*</span></label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required 
                  min="0.001"
                  max={currentQty}
                  step="0.001"
                  placeholder={`Tối đa ${currentQty} ${item.unit}`}
                  autoFocus
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Ghi chú chi tiết (tùy chọn)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ví dụ: Nhập thừa 5 gói do nhìn nhầm hóa đơn NCC..."
                  maxLength={500}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light-soft" onClick={onClose}>Hủy</button>
              <button 
                type="submit" 
                className="btn btn-warning text-dark fw-semibold" 
                disabled={loading || reduceQty <= 0 || reduceQty > currentQty}
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận giảm kho'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
