import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

export default function StockInModal({ show, onClose, onSuccess, item }) {
  const { addToast } = useToast()
  
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show) {
      setQuantity('')
      setNote('')
    }
  }, [show])

  if (!show || !item) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quantity || Number(quantity) <= 0) {
      addToast({ message: 'Số lượng nhập phải lớn hơn 0', type: 'error' })
      return
    }
    
    setLoading(true)
    try {
      await inventoryApi.stockIn(item.id, {
        quantity: Number(quantity),
        note: note.trim()
      })
      addToast({ message: `Nhập kho ${item.itemName} thành công`, type: 'success' })
      onSuccess()
    } catch (err) {
      addToast({ message: errorMessage(err), type: 'error' })
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
              <h5 className="modal-title">Nhập kho: {item.itemName}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Số lượng nhập ({item.unit}) <span className="text-danger">*</span></label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required 
                  min="0.001"
                  step="0.001"
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Ghi chú (tùy chọn)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={500}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light-soft" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
