import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'

// Hoàn tiền đơn online đã trả QR (ThangNN Iter3). Luôn hoàn cả đơn, bằng chuyển khoản.
// mode = 'cancel': đơn chưa được lấy đi giao -> hủy đơn + tạo phiếu hoàn (mở từ màn Đơn giao hàng).
// mode = 'refund': đơn đã bị hủy (giao không thành công) -> chỉ tạo phiếu hoàn (mở từ popup Hoàn tiền ở Lịch sử đơn).

const CANCEL_REASONS = ['Hết nguyên liệu', 'Khách gọi hủy đơn', 'Quán không giao được']

/**
 * target = { orderId, label, amount, customerName, customerPhone, cancelReason } (null = đóng).
 * onDone(refundView) sau khi tạo phiếu hoàn.
 */
export default function CancelRefundModal({ target, mode = 'cancel', onClose, onDone }) {
  const isCancel = mode === 'cancel'
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!target) return
    setReason(isCancel ? CANCEL_REASONS[0] : '')
    setError('')
  }, [target, isCancel])

  if (!target) return null

  const submit = async () => {
    if (isCancel && !reason.trim()) {
      setError('Nhập lý do hủy đơn.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = isCancel
        ? await cashierApi.cancelDeliveryWithRefund(target.orderId, reason.trim())
        : await cashierApi.refundCancelledDelivery(target.orderId, reason.trim() || undefined)
      onDone(res.data)
    } catch (e) {
      setError(errorMessage(e, isCancel ? 'Không hủy được đơn.' : 'Không tạo được phiếu hoàn.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      show
      title={isCancel ? `Hủy và hoàn tiền đơn ${target.label}?` : `Tạo phiếu hoàn đơn ${target.label}`}
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={busy}>
            {isCancel ? 'Không hủy' : 'Đóng'}
          </button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            {isCancel ? 'Hủy đơn và tạo phiếu hoàn' : `Tạo phiếu hoàn ${formatMoney(target.amount)}`}
          </button>
        </>
      }
    >
      <div className="cust-chip mb-3">
        <i className="bi bi-person fs-5 text-secondary" aria-hidden="true" />
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="fw-semibold">{target.customerName || 'Khách đặt online'}</div>
          <div className="cell-sub">{target.customerPhone || 'Không có số điện thoại'}</div>
        </div>
        <div className="text-end">
          <div className="cell-sub">Đã trả QR</div>
          <div className="fw-semibold text-nowrap">{formatMoney(target.amount)}</div>
        </div>
      </div>

      <p className="small">
        {isCancel && 'Đơn bị hủy ngay, pha chế không làm tiếp. '}
        Phiếu hoàn <strong>{formatMoney(target.amount)}</strong> chờ ở nút Hoàn tiền của Lịch sử đơn: chuyển khoản trả lại vào tài khoản
        khách đã dùng để thanh toán (tra bằng mã giao dịch QR), rồi nhập mã giao dịch để hoàn tất.
      </p>
      {!isCancel && target.cancelReason && <p className="small cf-muted">Lý do hủy đơn: {target.cancelReason}</p>}

      <label className="form-label" htmlFor="cancel-refund-reason">
        {isCancel ? 'Lý do hủy (khách xem được ở trang theo dõi đơn)' : 'Ghi chú hoàn tiền (không bắt buộc)'}
      </label>
      {isCancel && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {CANCEL_REASONS.map((r) => (
            <button key={r} type="button" className={`btn btn-sm ${reason === r ? 'btn-primary' : 'btn-light-soft'}`}
                    onClick={() => setReason(r)} aria-pressed={reason === r} disabled={busy}>
              {r}
            </button>
          ))}
        </div>
      )}
      <input id="cancel-refund-reason" className="form-control" maxLength={200} value={reason} disabled={busy}
             onChange={(e) => setReason(e.target.value)}
             placeholder={isCancel ? 'Nhập lý do khác' : 'Bỏ trống = dùng lý do hủy đơn'} />
      {error && <div className="alert alert-danger small mt-3 mb-0">{error}</div>}
    </Modal>
  )
}
