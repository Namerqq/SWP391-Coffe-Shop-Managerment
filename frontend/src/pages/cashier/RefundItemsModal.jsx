import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { ITEM_STATUS_LABEL } from '../../utils/itemStatus'

// Hoàn tiền món chưa mang ra của đơn tại bàn / mang đi đã thanh toán (ThangNN Iter3, mở từ Lịch sử đơn).
// Server tính số tiền (chia theo tỉ lệ khách thực trả nếu có dùng điểm) và điểm bị trừ / trả lại; thu ngân xem trước rồi xác nhận.
// Món đã pha xong (Chờ mang ra) thì hệ thống ghi thêm biên bản sự cố cho quản lý. Món đã mang ra không hoàn ở đây.

const REASONS = ['Hết nguyên liệu', 'Khách đổi ý', 'Chờ lâu quá', 'Làm sai món']

const METHODS = [
  { value: 'CASH', label: 'Tiền mặt', icon: 'bi-cash', hint: 'Đưa tiền cho khách ngay, phiếu hoàn xong luôn.' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản', icon: 'bi-bank',
    hint: 'Phiếu chờ ở nút Hoàn tiền của Lịch sử đơn tới khi bạn chuyển khoản trả khách và nhập mã giao dịch.' },
]

/** order = OrderView cần hoàn (null = đóng). onDone(refundView) sau khi hoàn xong. */
export default function RefundItemsModal({ order, onClose, onDone }) {
  const [selected, setSelected] = useState([])
  const [reason, setReason] = useState(REASONS[0])
  const [method, setMethod] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const previewNo = useRef(0)

  useEffect(() => {
    if (!order) return
    setSelected([])
    setReason(REASONS[0])
    setMethod('')
    setPreview(null)
    setPreviewError('')
    setError('')
  }, [order])

  // Mỗi lần đổi món chọn: hỏi server số tiền / điểm (chỉ lấy kết quả của lần hỏi mới nhất).
  useEffect(() => {
    const no = ++previewNo.current
    if (!order || selected.length === 0) {
      setPreview(null)
      setPreviewError('')
      return
    }
    cashierApi.previewRefund({ orderId: order.id, itemIds: selected })
      .then((res) => {
        if (no !== previewNo.current) return
        setPreview(res.data)
        setPreviewError('')
        setMethod((m) => m || res.data.paymentMethod) // mặc định hoàn đúng cách khách đã trả
      })
      .catch((e) => {
        if (no !== previewNo.current) return
        setPreview(null)
        setPreviewError(errorMessage(e, 'Không tính được số tiền hoàn.'))
      })
  }, [order, selected])

  if (!order) return null
  const lines = order.items.filter((i) => i.status !== 'CANCELLED')
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const canSubmit = Boolean(preview) && selected.length > 0 && !previewError && reason.trim() && method && !busy

  const submit = async () => {
    if (!reason.trim()) {
      setError('Nhập lý do hoàn tiền.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await cashierApi.refundOrderItems(order.id, {
        itemIds: selected, reason: reason.trim(), method, expectedAmount: preview.amount,
      })
      onDone(res.data)
    } catch (e) {
      setError(errorMessage(e, 'Không hoàn tiền được.'))
      if (e.response?.status === 409) setSelected((s) => [...s]) // số tiền vừa đổi: tính lại để thu ngân xem
    } finally {
      setBusy(false)
    }
  }

  const pointsParts = []
  if (preview?.pointsTakenBack > 0) pointsParts.push(`trừ ${preview.pointsTakenBack} điểm đã cộng`)
  if (preview?.pointsReturned > 0) pointsParts.push(`trả lại ${preview.pointsReturned} điểm đã dùng`)

  return (
    <Modal
      show
      size="lg"
      title={`Hoàn tiền đơn ${order.displayNumber}`}
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={busy}>Đóng</button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={!canSubmit}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            {preview ? `Hoàn ${formatMoney(preview.amount)}` : 'Hoàn tiền'}
          </button>
        </>
      }
    >
      <p className="small cf-muted mb-2">
        Chọn món khách không dùng nữa. Món đã mang ra cho khách không hoàn ở đây.
      </p>
      <div className="refund-lines mb-3">
        {lines.map((i) => {
          const served = i.status === 'SERVED'
          return (
            <label key={i.id} className={`refund-line ${served ? 'is-disabled' : ''}`}>
              <input type="checkbox" className="form-check-input mt-0" disabled={served || busy}
                     checked={selected.includes(i.id)} onChange={() => toggle(i.id)} />
              <span className="order-qty">{i.quantity}×</span>
              <span className="flex-grow-1" style={{ minWidth: 0 }}>
                <span className="fw-semibold">{i.itemName}</span>
                <span className="cell-sub d-block">
                  {ITEM_STATUS_LABEL[i.status] || i.status}
                  {itemOptionsText(i) && <> · {itemOptionsText(i)}</>}
                  {served && ' · đã mang ra'}
                </span>
              </span>
              <span className="fw-semibold text-nowrap">{formatMoney(i.subtotal)}</span>
            </label>
          )
        })}
      </div>

      {previewError && <div className="alert alert-danger small">{previewError}</div>}
      {preview && (
        <div className="refund-summary mb-3">
          <div className="d-flex justify-content-between"><span>Giá các món chọn</span><span>{formatMoney(preview.itemsValue)}</span></div>
          {preview.amount < preview.itemsValue && (
            <div className="cell-sub">Hóa đơn có giảm giá bằng điểm nên tiền hoàn chia theo tỉ lệ khách thực trả.</div>
          )}
          <div className="d-flex justify-content-between refund-grand"><span>Trả lại khách</span><span>{formatMoney(preview.amount)}</span></div>
          {pointsParts.length > 0 && (
            <div className="cell-sub">Khách thân thiết {preview.customerName}: {pointsParts.join(', ')}.</div>
          )}
          {preview.fullRefund && <div className="cell-sub">Đây là các món cuối của hóa đơn, hoàn xong thì đơn bị hủy.</div>}
        </div>
      )}
      {preview?.hasMadeItems && (
        <div className="alert alert-warning small">
          <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
          Có món <strong>đã pha xong</strong>: nguyên liệu đã trừ kho, hệ thống ghi thêm biên bản sự cố để quản lý xem.
        </div>
      )}

      <div className="mb-3">
        <div className="form-label">Trả lại bằng</div>
        <div className="d-flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button key={m.value} type="button" className={`pay-method ${method === m.value ? 'active' : ''}`}
                    onClick={() => setMethod(m.value)} aria-pressed={method === m.value} disabled={busy}>
              <i className={`bi ${m.icon} me-1`} aria-hidden="true" />{m.label}
            </button>
          ))}
        </div>
        {method && <div className="cell-sub mt-1">{METHODS.find((m) => m.value === method)?.hint}</div>}
      </div>

      <label className="form-label" htmlFor="refund-reason">Lý do</label>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {REASONS.map((r) => (
          <button key={r} type="button" className={`btn btn-sm ${reason === r ? 'btn-primary' : 'btn-light-soft'}`}
                  onClick={() => setReason(r)} aria-pressed={reason === r} disabled={busy}>
            {r}
          </button>
        ))}
      </div>
      <input id="refund-reason" className="form-control" maxLength={200} value={reason}
             onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do khác" disabled={busy} />
      {error && <div className="alert alert-danger small mt-3 mb-0">{error}</div>}
    </Modal>
  )
}
