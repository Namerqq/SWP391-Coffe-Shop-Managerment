import Modal from '../../components/Modal'
import StatusPill from '../../components/order/StatusPill'
import { elapsedLabel, formatTime, isWaiting, itemOptionsText, placeLabel } from '../../utils/orderFormat'

/**
 * Order Detail (Barista) - UC-B02 View Orders details, UC-B03 Update Order status.
 * Chỉ hiện thông tin cần để pha (không có giá tiền / thông tin thanh toán).
 */
export default function BaristaOrderModal({ order, busy, onClose, onStart, onReady, onCancel, onRecipe }) {
  if (!order) return null
  const items = order.items.filter((i) => i.status !== 'CANCELLED')
  const waiting = isWaiting(order.status)

  let footer = <button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>
  if (waiting) {
    footer = (
      <>
        <button type="button" className="btn btn-outline-danger me-auto" onClick={() => onCancel(order)}>Hết nguyên liệu, hủy đơn</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onStart(order)}>Bắt đầu pha</button>
      </>
    )
  } else if (order.status === 'PREPARING') {
    footer = (
      <>
        <button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>
        <button type="button" className="btn btn-ready" disabled={busy} onClick={() => onReady(order)}>Pha xong, báo mang ra</button>
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
        <div className="order-line align-items-start" key={i.id}>
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
