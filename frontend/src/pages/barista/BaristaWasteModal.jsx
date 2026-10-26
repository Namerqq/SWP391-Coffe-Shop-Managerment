import { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import baristaApi from '../../api/baristaApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

/**
 * UC-B06: Barista báo hao hụt / hư hỏng nguyên liệu tại quầy.
 */
export default function BaristaWasteModal({ show, item, onClose, onSuccess }) {
  const toast = useToast()
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show) {
      setQuantity('')
      setNote('')
    }
  }, [show])

  if (!item) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const numQty = parseFloat(quantity)
    if (!numQty || numQty <= 0) {
      toast('Số lượng hao hụt phải lớn hơn 0', 'warning')
      return
    }

    if (numQty > Number(item.currentQuantity)) {
      toast(`Số lượng hao hụt không được vượt quá số tồn hiện tại (${item.currentQuantity} ${item.unit})`, 'warning')
      return
    }

    setLoading(true)
    try {
      await baristaApi.reportWaste(item.id, {
        quantity: numQty,
        note: note.trim(),
      })
      toast(`Đã ghi nhận hao hụt ${numQty} ${item.unit} ${item.itemName}`)
      onSuccess?.()
      onClose?.()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      show={show}
      title={`Báo hao hụt / Hư hỏng: ${item.itemName}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={loading}>
            Hủy
          </button>
          <button type="button" className="btn btn-danger" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Xác nhận hao hụt'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-medium">Nguyên liệu</label>
          <div className="form-control-plaintext fw-bold">
            {item.itemName} (Tồn hiện tại: {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit})
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-medium">
            Số lượng hao hụt / hỏng ({item.unit})
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            max={Number(item.currentQuantity)}
            className="form-control"
            placeholder={`Tối đa: ${item.currentQuantity}`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-medium">Lý do hư hỏng / hao hụt</label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="Ví dụ: Rơi đổ hộp sữa, sữa chua hỏng, quá hạn bảo quản..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="alert alert-warning py-2 small mb-0">
          <i className="bi bi-exclamation-triangle me-1" />
          Số lượng tồn kho sẽ bị trừ ngay lập tức và ghi nhận giao dịch "Hao hụt / Hư hỏng" vào sổ nhật ký kho.
        </div>
      </form>
    </Modal>
  )
}
