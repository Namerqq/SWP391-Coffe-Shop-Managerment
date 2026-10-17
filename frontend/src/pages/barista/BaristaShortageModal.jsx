import { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import baristaApi from '../../api/baristaApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

/**
 * UC-B05: Barista báo thiếu nguyên liệu, tạo yêu cầu bổ sung gửi tới Quản lý.
 */
export default function BaristaShortageModal({ show, initialItem, items = [], onClose, onSuccess }) {
  const toast = useToast()
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show) {
      setSelectedId(initialItem ? String(initialItem.id) : (items[0]?.id ? String(items[0].id) : ''))
      setQuantity('')
      setNote('')
    }
  }, [show, initialItem, items])

  const currentItem = items.find((i) => String(i.id) === String(selectedId)) || initialItem

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedId) {
      toast('Vui lòng chọn nguyên liệu cần báo thiếu', 'warning')
      return
    }
    const numQty = parseFloat(quantity)
    if (!numQty || numQty <= 0) {
      toast('Số lượng yêu cầu bổ sung phải lớn hơn 0', 'warning')
      return
    }

    setLoading(true)
    try {
      await baristaApi.reportShortage({
        inventoryItemId: Number(selectedId),
        requestedQuantity: numQty,
        note: note.trim(),
      })
      toast('Đã gửi yêu cầu bổ sung nguyên liệu đến Quản lý!')
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
      title="Báo thiếu nguyên liệu (Yêu cầu bổ sung)"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={loading}>
            Hủy
          </button>
          <button type="button" className="btn btn-warning" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-medium">Nguyên liệu cần bổ sung</label>
          <select
            className="form-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.itemName} (Tồn hiện tại: {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label fw-medium">
            Số lượng yêu cầu bổ sung {currentItem?.unit ? `(${currentItem.unit})` : ''}
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            className="form-control"
            placeholder="Ví dụ: 5"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-medium">Ghi chú lý do</label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="Ví dụ: Lượng khách gọi Matcha hôm nay tăng đột biến, quầy sắp hết..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="alert alert-info py-2 small mb-0">
          <i className="bi bi-info-circle me-1" />
          Yêu cầu sẽ được tạo dưới dạng phiếu nháp để Quản lý duyệt và tiến hành nhập kho.
        </div>
      </form>
    </Modal>
  )
}
