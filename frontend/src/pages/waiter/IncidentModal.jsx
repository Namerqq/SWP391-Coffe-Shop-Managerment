import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import servingApi from '../../api/servingApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { isFromPreviousDay, placeLabel } from '../../utils/orderFormat'

const QUICK_REASONS = [
  'Vấp ngã / trượt chân khi mang ra',
  'Va chạm với khách ở lối đi',
  'Khách vô ý gạt trúng làm rơi',
  'Vỡ ly khi đặt xuống bàn',
  'Lý do khác',
]

export default function IncidentModal({ show, order, item, onClose, onSuccess }) {
  const toast = useToast()
  const [action, setAction] = useState('REMAKE') // REMAKE | CANCEL
  const [quickReason, setQuickReason] = useState(QUICK_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [quantity, setQuantity] = useState(1) // số ly bị đổ / vỡ trong dòng (vd 1 trong 2× Latte)
  const [loading, setLoading] = useState(false)

  // Đơn đã thanh toán: không hủy món ở đây được (cần thu ngân hoàn tiền).
  // Đơn của ngày trước: pha chế không còn thấy đơn nên không gửi làm lại được.
  const paid = order?.paymentStatus === 'PAID'
  const previousDay = order ? isFromPreviousDay(order) : false
  const canRemake = !previousDay
  const canCancel = !paid
  const nothingAllowed = !canRemake && !canCancel

  // Mở cho món khác thì đặt lại số ly về 1 (thường chỉ đổ / vỡ 1 ly) và chọn sẵn hướng xử lý còn được phép
  useEffect(() => {
    setQuantity(1)
    setAction(canRemake ? 'REMAKE' : 'CANCEL')
  }, [item?.id, canRemake])

  if (!show || !order || !item) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((action === 'REMAKE' && !canRemake) || (action === 'CANCEL' && !canCancel)) return
    setLoading(true)

    const finalReason = quickReason === 'Lý do khác'
      ? (customReason.trim() || 'Lý do khác')
      : (customReason.trim() ? `${quickReason} (${customReason.trim()})` : quickReason)

    try {
      // Ít ly hơn cả dòng thì backend tách các ly bị sự cố thành dòng riêng, ly còn lại vẫn Chờ mang ra
      const res = await servingApi.reportIncident(order.id, item.id, {
        action,
        reason: finalReason,
        quantity,
      })
      toast(
        action === 'REMAKE'
          ? `Đã báo sự cố: ${quantity}× ${item.itemName} đã được gửi lại pha chế để làm lại. Biên bản đã gửi quản lý.`
          : `Đã hủy ${quantity}× ${item.itemName}, không tính tiền các ly này. Biên bản đã gửi quản lý.`,
        'success'
      )
      if (onSuccess) onSuccess(res.data, action)
      onClose()
    } catch (err) {
      toast(errorMessage(err, 'Không thể gửi báo cáo sự cố.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      show={show}
      title="Báo cáo sự cố làm đổ / vỡ ly"
      onClose={loading ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={loading}>
            Đóng
          </button>
          <button type="button" className="btn btn-danger" onClick={handleSubmit} disabled={loading || nothingAllowed}>
            {loading && <span className="spinner-border spinner-border-sm me-2" />}
            Xác nhận báo cáo
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill fs-5 me-2 text-warning" />
          <div>
            <strong>{item.quantity}× {item.itemName}</strong>
            <span className="cf-muted ms-2">— Đơn {order.displayNumber} ({placeLabel(order)})</span>
          </div>
        </div>

        {/* Số ly bị sự cố: chỉ hiện khi dòng có từ 2 ly trở lên */}
        {item.quantity > 1 && (
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="incidentQty">Số ly bị đổ / vỡ</label>
            <select id="incidentQty" className="form-select w-auto" value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}>
              {Array.from({ length: item.quantity }, (_, k) => k + 1).map((n) => (
                <option key={n} value={n}>{n} / {item.quantity} ly</option>
              ))}
            </select>
            {quantity < item.quantity && (
              <div className="form-text">{item.quantity - quantity} ly còn lại vẫn ở "Chờ mang ra", không bị ảnh hưởng.</div>
            )}
          </div>
        )}

        {nothingAllowed && (
          <div className="alert alert-danger py-2 px-3 mb-3">
            <i className="bi bi-x-octagon me-1" />
            Đơn của ngày trước và đã thanh toán: pha chế không làm lại được, cũng không hủy món ở đây được.
            Vui lòng <strong>báo Thu ngân hoàn tiền</strong> món này.
          </div>
        )}

        {/* Hướng xử lý */}
        <div className="mb-3">
          <label className="form-label fw-semibold">1. Hướng xử lý tiếp theo</label>
          <div className="form-check mb-2">
            <input
              type="radio"
              className="form-check-input"
              id="actionRemake"
              name="incidentAction"
              value="REMAKE"
              checked={action === 'REMAKE'}
              disabled={!canRemake}
              onChange={() => setAction('REMAKE')}
            />
            <label className={`form-check-label fw-medium ${canRemake ? 'text-primary' : 'text-body-secondary'}`} htmlFor="actionRemake">
              <i className="bi bi-arrow-repeat me-1" />
              Khách muốn làm lại (gửi lại pha chế làm gấp)
            </label>
            <div className="form-text ms-1">
              {canRemake
                ? <>Khách chỉ thanh toán 1 ly ban đầu, cốc làm lại <strong>tuyệt đối không tính thêm tiền</strong>.</>
                : <>Đơn của ngày trước: pha chế không còn thấy đơn này nên <strong>không làm lại được</strong>.</>}
            </div>
          </div>

          <div className="form-check">
            <input
              type="radio"
              className="form-check-input"
              id="actionCancel"
              name="incidentAction"
              value="CANCEL"
              checked={action === 'CANCEL'}
              disabled={!canCancel}
              onChange={() => setAction('CANCEL')}
            />
            <label className={`form-check-label fw-medium ${canCancel ? 'text-danger' : 'text-body-secondary'}`} htmlFor="actionCancel">
              <i className="bi bi-x-circle me-1" />
              Khách không muốn làm lại (hủy món)
            </label>
            <div className="form-text ms-1">
              {canCancel
                ? <>Hệ thống sẽ <strong>tự động trừ tiền món này</strong> khỏi hóa đơn của khách.</>
                : <>Đơn đã thanh toán: không hủy món ở đây được, cần <strong>Thu ngân hoàn tiền</strong>.</>}
            </div>
          </div>
        </div>

        <div className="form-text mb-3">
          <i className="bi bi-shield-lock me-1" />
          Biên bản chỉ gửi cho quản lý xem xét mức phạt, khách không nhìn thấy thông tin sự cố.
        </div>

        {/* Lý do sự cố */}
        <div className="mb-2">
          <label className="form-label fw-semibold" htmlFor="quickReasonSelect">
            2. Nguyên nhân sự cố
          </label>
          <select
            id="quickReasonSelect"
            className="form-select mb-2"
            value={quickReason}
            onChange={(e) => setQuickReason(e.target.value)}
          >
            {QUICK_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            type="text"
            className="form-control"
            placeholder={quickReason === 'Lý do khác' ? 'Nhập chi tiết nguyên nhân (bắt buộc)...' : 'Ghi chú thêm (không bắt buộc)...'}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            maxLength={150}
          />
        </div>
      </form>
    </Modal>
  )
}
