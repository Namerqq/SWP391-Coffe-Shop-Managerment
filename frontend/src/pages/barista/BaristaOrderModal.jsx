import Modal from '../../components/Modal'
import StatusPill from '../../components/order/StatusPill'
import { elapsedLabel, formatTime, itemOptionsText, placeLabel } from '../../utils/orderFormat'
import { ITEM_STATUS_LABEL, isItemCancelled, isItemDone, isItemReady, isItemWaiting } from '../../utils/itemStatus'

/**
 * Order Detail (Barista) - UC-B02 View Orders details, UC-B03 Update Order status.
 * Chỉ hiện thông tin cần để pha (không có giá tiền / thông tin thanh toán). Tích / hủy theo từng món như trên bảng.
 */
export default function BaristaOrderModal({ order, busyItemId, onClose, onToggleItem, onCancelItem, onRecipe }) {
  if (!order) return null
  const items = order.items.filter((i) => !isItemCancelled(i))
  const cancelled = order.items.filter(isItemCancelled)
  const doneCount = items.filter(isItemDone).length

  const footer = (
    <>
      <span className="kds-progress me-auto mb-0">
        <i className="bi bi-check2-square me-1" />Đã pha {doneCount}/{items.length} món
      </span>
      <button type="button" className="btn btn-light-soft" onClick={onClose}>Đóng</button>
    </>
  )

  return (
    <Modal show title={`Đơn ${order.displayNumber}`} onClose={onClose} footer={footer}>
      <dl className="mb-3">
        <div className="info-row"><dt>Trạng thái</dt><dd><StatusPill status={order.status} /></dd></div>
        <div className="info-row"><dt>Nơi nhận</dt><dd>{placeLabel(order)}</dd></div>
        <div className="info-row"><dt>Gọi lúc</dt><dd>{formatTime(order.createdAt)} ({elapsedLabel(order.createdAt)})</dd></div>
        {order.customerNote && <div className="info-row"><dt>Ghi chú của khách</dt><dd className="order-note">{order.customerNote}</dd></div>}
      </dl>
      <div className="fw-semibold mb-1">{items.reduce((s, i) => s + i.quantity, 0)} món</div>
      {items.map((i) => (
        <div className="order-line align-items-start" key={i.id}>
          {isItemWaiting(i) && (
            <input type="checkbox" className="form-check-input kds-check" checked={false}
                   disabled={busyItemId === i.id} onChange={() => onToggleItem(order, i, true)}
                   aria-label={`Đã pha xong ${i.itemName}`} title="Tích khi pha xong món này" />
          )}
          {isItemReady(i) && (
            <input type="checkbox" className="form-check-input kds-check" checked
                   disabled={busyItemId === i.id} onChange={() => onToggleItem(order, i, false)}
                   aria-label={`Bỏ tích ${i.itemName}`} title="Bỏ tích nếu tích nhầm" />
          )}
          {i.status === 'SERVED' && <i className="bi bi-check2-all kds-served-icon" title="Đã mang ra" />}
          <span className="order-qty">{i.quantity}×</span>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-semibold">{i.itemName}</div>
            {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
            {i.note && <div className="order-note"><i className="bi bi-chat-left-text me-1" />{i.note}</div>}
            <div className="cell-sub">{ITEM_STATUS_LABEL[i.status] || i.status}</div>
          </div>
          <div className="kds-item-actions">
            <button type="button" className="btn btn-light-soft btn-sm" onClick={() => onRecipe(i)}>
              <i className="bi bi-journal-text me-1" />Công thức
            </button>
            {isItemWaiting(i) && (
              <button type="button" className="btn btn-light-soft btn-icon kds-cancel-item" title="Hết nguyên liệu, hủy món"
                      aria-label={`Hủy ${i.itemName}`} disabled={busyItemId === i.id} onClick={() => onCancelItem(order, i)}>
                <i className="bi bi-x-lg" />
              </button>
            )}
          </div>
        </div>
      ))}
      {cancelled.length > 0 && (
        <div className="kds-cancelled-note mt-2">
          <i className="bi bi-x-circle me-1" />Đã hủy (hết nguyên liệu): {cancelled.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}
        </div>
      )}
    </Modal>
  )
}
