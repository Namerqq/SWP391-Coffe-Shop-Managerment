import AppModal from '../AppModal'
import { formatVnd } from '../../utils/format'

// Mô tả tuỳ chọn của 1 dòng: "50% đường · 100% đá"
export const describeLine = (line) =>
  [
    line.sugarLevel && `${line.sugarLevel} đường`,
    line.iceLevel && `${line.iceLevel} đá`,
  ].filter(Boolean).join(' · ')

// Modal giỏ hàng (1.0.2 confirm order): đổi số lượng, sửa lựa chọn, gửi đơn.
export default function CartModal({ show, cart, submitting, error, onClose, onChangeQty, onEdit, onSubmit }) {
  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  return (
    <AppModal
      show={show}
      title="Giỏ hàng"
      onClose={onClose}
      width={520}
      footer={
        <button className="btn btn-primary w-100 d-flex justify-content-between py-2"
          disabled={cart.length === 0 || submitting} onClick={onSubmit}>
          <span>{submitting ? 'Đang gửi...' : 'Gửi đơn cho quán'}</span>
          <span>{formatVnd(total)}</span>
        </button>
      }
    >
      {cart.length === 0 && <div className="text-center text-muted py-4">Giỏ hàng đang trống</div>}

      {cart.map((line) => (
        <div key={line.key} className="d-flex justify-content-between gap-3 py-3 border-bottom">
          <div className="flex-grow-1">
            <div className="fw-semi">{line.name}</div>
            {describeLine(line) && <div className="text-muted small">{describeLine(line)}</div>}
            {line.note && <div className="text-muted small fst-italic">“{line.note}”</div>}
            <button type="button" className="btn btn-link btn-sm p-0 text-coffee" onClick={() => onEdit(line)}>
              Sửa lựa chọn
            </button>
          </div>
          <div className="text-end">
            <div className="fw-semi mb-2">{formatVnd(line.unitPrice * line.quantity)}</div>
            <div className="stepper">
              <button type="button" onClick={() => onChangeQty(line.key, line.quantity - 1)}
                aria-label={line.quantity === 1 ? 'Xóa món' : 'Giảm'}>
                {line.quantity === 1 ? '🗑' : '−'}
              </button>
              <span>{line.quantity}</span>
              <button type="button" onClick={() => onChangeQty(line.key, line.quantity + 1)} aria-label="Tăng">+</button>
            </div>
          </div>
        </div>
      ))}

      {cart.length > 0 && (
        <p className="text-muted small mt-3 mb-0">
          Đơn được gửi tới quầy để xác nhận. Sau khi gửi, muốn đổi hoặc hủy món, bạn nhờ nhân viên hỗ trợ.
        </p>
      )}
      {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
    </AppModal>
  )
}
