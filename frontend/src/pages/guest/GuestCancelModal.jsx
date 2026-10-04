import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { errorMessage } from '../../api/axiosClient'

/** Khách xác nhận hủy đơn (lý do không bắt buộc). onConfirm(reason) trả về Promise. */
export default function GuestCancelModal({ order, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setReason(''); setError('') }, [order?.id])
  if (!order) return null

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await onConfirm(reason.trim())
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show title={`Hủy đơn ${order.displayNumber}?`} onClose={saving ? undefined : onClose}
           footer={
             <>
               <button type="button" className="btn btn-light-soft" disabled={saving} onClick={onClose}>Giữ đơn</button>
               <button type="button" className="btn btn-danger" disabled={saving} onClick={submit}>
                 {saving && <span className="spinner-border spinner-border-sm me-2" />}Hủy đơn
               </button>
             </>
           }>
      <p className="gx-muted">Chỉ hủy được khi quán chưa bắt đầu pha. Món đã hủy không tính tiền.</p>
      <label className="form-label" htmlFor="gx-cancel-reason">Lý do (không bắt buộc)</label>
      <input id="gx-cancel-reason" className="form-control" maxLength={300} placeholder="VD: gọi nhầm món"
             value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && <div className="text-danger small mt-2">{error}</div>}
    </Modal>
  )
}
