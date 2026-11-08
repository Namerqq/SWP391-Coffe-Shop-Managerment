import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { errorMessage } from '../../api/axiosClient'

const MAX_SIDE = 1280 // thu nhỏ ảnh điện thoại (thường 3-8 MB) trước khi gửi, server nhận tối đa 5 MB

/** Thu nhỏ ảnh về tối đa 1280px, lưu JPG. Trình duyệt không đọc được ảnh thì gửi nguyên file. */
function shrinkImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], 'giao-hang.jpg', { type: 'image/jpeg' }) : file),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

/**
 * Phục vụ bấm "Đã giao": bắt buộc chụp / chọn 1 ảnh món lúc giao cho khách.
 * Trên điện thoại, ô chọn ảnh tự cho chọn Chụp ảnh hoặc Thư viện. onConfirm(file) trả về Promise.
 */
export default function DeliveryPhotoModal({ show, order, onClose, onConfirm }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (show) { setFile(null); setPreview(''); setError('') }
  }, [show, order?.orderId])

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  if (!show || !order) return null

  const pick = async (e) => {
    const picked = e.target.files?.[0]
    e.target.value = '' // chọn lại cùng ảnh vẫn nhận
    if (!picked) return
    if (!picked.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh.')
      return
    }
    const small = await shrinkImage(picked)
    setFile(small)
    setPreview(URL.createObjectURL(small))
    setError('')
  }

  const submit = async () => {
    if (!file) {
      setError('Vui lòng chụp ảnh món khi giao cho khách.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onConfirm(file)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      show
      title={`Xác nhận đã giao đơn ${order.orderNumber || order.displayNumber}`}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={saving}>Quay lại</button>
          <button type="button" className="btn btn-success" onClick={submit} disabled={saving || !file}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            Xác nhận đã giao
          </button>
        </>
      }
    >
      <p className="cf-muted small">Chụp ảnh món lúc giao cho khách để làm bằng chứng.</p>
      <label className="btn btn-outline-primary w-100" htmlFor="delivery-photo">
        <i className="bi bi-camera me-1" />
        {file ? 'Chụp / chọn lại ảnh' : 'Chụp / chọn ảnh'}
      </label>
      <input id="delivery-photo" type="file" accept="image/*" className="d-none" onChange={pick} />
      {preview && (
        <img src={preview} alt="Ảnh giao hàng" className="img-fluid rounded border mt-3 w-100"
             style={{ maxHeight: 320, objectFit: 'contain' }} />
      )}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </Modal>
  )
}
