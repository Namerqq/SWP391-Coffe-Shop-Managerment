import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { errorMessage } from '../../api/axiosClient'

/** Hỏi lý do rồi hủy đơn (dùng cho Phục vụ và Pha chế). onConfirm(reason) trả về Promise. */
export default function CancelOrderModal({ show, order, title = 'Hủy đơn', message, label = 'Lý do hủy',
  required = false, placeholder = '', confirmText = 'Hủy đơn', onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (show) { setReason(''); setError('') }
  }, [show, order?.id])

  if (!show || !order) return null

  const submit = async () => {
    if (required && !reason.trim()) {
      setError('Vui lòng nhập lý do.')
      return
    }
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
    <Modal
      show
      title={`${title} ${order.displayNumber}`}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={saving}>Quay lại</button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            {confirmText}
          </button>
        </>
      }
    >
      <p className="cf-muted small">{message || 'Đơn sẽ chuyển sang Đã hủy và không được tính tiền. Chỉ hủy được khi đơn chưa bắt đầu pha.'}</p>
      <label className="form-label" htmlFor="cancel-reason">{label}{!required && ' (không bắt buộc)'}</label>
      <textarea id="cancel-reason" className={`form-control ${error ? 'is-invalid' : ''}`} rows={3} maxLength={300}
                placeholder={placeholder} value={reason} autoFocus onChange={(e) => setReason(e.target.value)} />
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </Modal>
  )
}
