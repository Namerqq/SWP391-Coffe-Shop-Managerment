import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { ITEM_STATUS_LABEL } from '../../utils/itemStatus'

// Bỏ món chưa phục vụ khi thanh toán (ThangNN Iter3): khách báo món chưa mang ra và không dùng nữa.
// Món Chờ pha: hủy luôn. Món Chờ mang ra (đã pha xong): hủy + hệ thống ghi biên bản sự cố cho quản lý.

const REASONS = ['Khách không dùng nữa', 'Chờ lâu quá', 'Khách gọi nhầm']

/** target = { order, item } đang hỏi bỏ món (null = đóng). onDone(orderView) sau khi bỏ xong. */
export default function CancelItemModal({ target, onClose, onDone }) {
  const [reason, setReason] = useState(REASONS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!target) return
    setReason(REASONS[0])
    setError('')
  }, [target])

  if (!target) return null
  const { order, item } = target
  const made = item.status === 'READY'
  const lastItem = order.items.filter((i) => i.status !== 'CANCELLED').length === 1

  const submit = async () => {
    if (!reason.trim()) {
      setError('Nhập lý do bỏ món.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await cashierApi.cancelOrderItem(order.id, item.id, { reason: reason.trim(), expectedStatus: item.status })
      onDone(res.data)
    } catch (e) {
      setError(errorMessage(e, 'Không bỏ được món.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      show
      title="Bỏ món khỏi hóa đơn?"
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={busy}>Không bỏ</button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            Bỏ món, bớt {formatMoney(item.subtotal)}
          </button>
        </>
      }
    >
      <div className="cust-chip mb-3">
        <span className="order-qty">{item.quantity}×</span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="fw-semibold">{item.itemName}</div>
          <div className="cell-sub">
            Đơn {order.displayNumber} · {ITEM_STATUS_LABEL[item.status] || item.status}
            {itemOptionsText(item) && <> · {itemOptionsText(item)}</>}
          </div>
        </div>
        <div className="fw-semibold text-nowrap">{formatMoney(item.subtotal)}</div>
      </div>

      {made ? (
        <div className="alert alert-warning small">
          <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
          Món <strong>đã pha xong</strong>, chỉ chưa mang ra: nguyên liệu đã trừ kho. Bỏ món sẽ ghi 1 biên bản sự cố
          để quản lý xem. Có thể hỏi khách đóng gói mang về thay vì bỏ.
        </div>
      ) : (
        <p className="small cf-muted">Món chưa pha: pha chế sẽ không thấy món này nữa, chưa tốn nguyên liệu.</p>
      )}
      {lastItem && (
        <p className="small mb-3">Đây là món cuối của đơn {order.displayNumber}, bỏ món thì <strong>cả đơn bị hủy</strong>.</p>
      )}

      <label className="form-label" htmlFor="cancel-item-reason">Lý do</label>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {REASONS.map((r) => (
          <button key={r} type="button" className={`btn btn-sm ${reason === r ? 'btn-primary' : 'btn-light-soft'}`}
                  onClick={() => setReason(r)} aria-pressed={reason === r}>
            {r}
          </button>
        ))}
      </div>
      <input id="cancel-item-reason" className="form-control" maxLength={200} value={reason}
             onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do khác" />
      {error && <div className="alert alert-danger small mt-3 mb-0">{error}</div>}
    </Modal>
  )
}
