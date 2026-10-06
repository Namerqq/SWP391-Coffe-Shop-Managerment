import Modal from '../../components/Modal'
import StatusPill from '../../components/order/StatusPill'
import { elapsedLabel, formatTime, isWaiting, itemOptionsText, placeLabel } from '../../utils/orderFormat'

/**
 * Order Detail (Barista) - UC-B02 View Orders details, UC-B03 Update Order status.
 * Chỉ hiện thông tin cần để pha (không có giá tiền / thông tin thanh toán).
 */
export default function BaristaOrderModal({ order, busy, busyItemId, onClose, onStart, onToggleItem, onCancel, onRecipe }) {
  if (!order) return null
  const items = order.items.filter((i) => i.status !== 'CANCELLED')
  const waiting = isWaiting(order.status)
  const preparing = order.status === 'PREPARING'
  const doneCount = items.filter((i) => i.status === 'READY').length

  let footer = <button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>
  if (waiting) {
    footer = (
      <>
        <button type="button" className="btn btn-outline-danger me-auto" onClick={() => onCancel(order)}>Hết nguyên liệu, hủy đơn</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onStart(order)}>Bắt đầu pha</button>
      </>
    )
  } else if (preparing) {
    // Không có nút "báo xong cả đơn": tích đủ từng món thì đơn tự sang Chờ mang ra.
    footer = (
      <>
        <span className="kds-progress me-auto mb-0">
          <i className="bi bi-check2-square me-1" />Đã pha {doneCount}/{items.length} món. Đủ món sẽ tự báo mang ra.
        </span>
        <button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>
      </>
    )
  }

  return (
    <Modal show title={`Đơn ${order.displayNumber}`} onClose={onClose} footer={footer}>
      <dl className="mb-3">
        <div className="info-row"><dt>Trạng thái</dt><dd><StatusPill status={order.status} /></dd></div>
        <div className="info-row"><dt>Nơi nhận</dt><dd>{placeLabel(order)}</dd></div>
        <div className="info-row"><dt>Gọi lúc</dt><dd>{formatTime(order.createdAt)} ({elapsedLabel(order.createdAt)})</dd></div>
        {order.customerNote && <div className="info-row"><dt>Ghi chú của khách</dt><dd className="order-note">{order.customerNote}</dd></div>}
      </dl>
      <div className="fw-semibold mb-1">{items.reduce((s, i) => s + i.quantity, 0)} món cần pha</div>
      {items.map((i) => (
        <div className={`order-line align-items-start ${preparing && i.status === 'READY' ? 'kds-done' : ''}`} key={i.id}>
          {preparing && (
            <input type="checkbox" className="form-check-input kds-check" checked={i.status === 'READY'}
                   disabled={busyItemId === i.id} onChange={() => onToggleItem(order, i)}
                   aria-label={`Đã pha xong ${i.itemName}`} title="Tích khi pha xong món này" />
          )}
          <span className="order-qty">{i.quantity}×</span>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-semibold">{i.itemName}</div>
            {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
            {i.note && <div className="order-note"><i className="bi bi-chat-left-text me-1" />{i.note}</div>}
          </div>
          <button type="button" className="btn btn-light-soft btn-sm" onClick={() => onRecipe(i)}>
            <i className="bi bi-journal-text me-1" />Công thức
          </button>
        </div>
      ))}
    </Modal>
  )
}
