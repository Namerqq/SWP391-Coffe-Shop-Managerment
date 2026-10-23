import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import incidentApi from '../../api/incidentApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../utils/orderFormat'

// Quản lý nhập mức phạt (0 = không phạt) và ghi chú cho 1 biên bản sự cố.
export default function IncidentReviewModal({ report, onClose, onSuccess }) {
  const toast = useToast()
  const [penalty, setPenalty] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Mở biên bản nào thì điền sẵn mức phạt / ghi chú cũ của biên bản đó
  useEffect(() => {
    if (report) {
      setPenalty(report.penaltyAmount !== null ? String(report.penaltyAmount) : '')
      setNote(report.managerNote || '')
    }
  }, [report])

  if (!report) return null

  const handleSave = async () => {
    const amount = Number(penalty)
    if (penalty === '' || Number.isNaN(amount) || amount < 0) {
      toast('Vui lòng nhập mức phạt hợp lệ (nhập 0 nếu không phạt).', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await incidentApi.review(report.id, { penaltyAmount: amount, managerNote: note.trim() })
      toast(amount > 0 ? `Đã phạt ${report.reporterName} ${formatMoney(amount)}` : `Đã xử lý: không phạt ${report.reporterName}`)
      onSuccess(res.data)
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      show
      title="Xử lý sự cố đổ / vỡ món"
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={saving}>Đóng</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            Lưu quyết định
          </button>
        </>
      }
    >
      <div className="alert alert-warning py-2 px-3 mb-3">
        <div><strong>{report.reporterName}</strong> làm đổ / vỡ <strong>{report.quantity}× {report.itemName}</strong></div>
        <div className="small">
          {report.tableNumber || 'Không rõ bàn'} · Đơn {report.displayNumber} · Giá trị món {formatMoney(report.itemValue)}
        </div>
        <div className="small">Nguyên nhân: {report.reason}</div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="penaltyInput">Mức phạt (đồng)</label>
        <input id="penaltyInput" type="number" min="0" step="1000" className="form-control"
               placeholder="Nhập 0 nếu không phạt" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
        <div className="form-text">Gợi ý: giá trị món bị đổ / vỡ là {formatMoney(report.itemValue)}.</div>
      </div>

      <div>
        <label className="form-label fw-semibold" htmlFor="managerNoteInput">Ghi chú của quản lý</label>
        <input id="managerNoteInput" type="text" className="form-control" maxLength={300}
               placeholder="Ví dụ: Nhắc nhở lần 1" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}
