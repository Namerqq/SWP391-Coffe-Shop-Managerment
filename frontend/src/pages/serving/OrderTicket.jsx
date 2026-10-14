import { elapsedLabel, itemOptionsText, placeLabel } from '../../utils/orderFormat'

/**
 * 1 thẻ đơn trên bảng Pha chế / Phục vụ. Chỉ hiện các món thuộc cột đó, nên cùng 1 đơn có thể nằm ở
 * cả 2 cột (món chưa xong ở "Chờ pha", món đã xong ở "Chờ mang ra").
 *   renderLeft / renderRight: ô tích, nút hủy, công thức... của từng món.   children: phần dưới thẻ.
 */
export default function OrderTicket({ order, items, tone, highlighted, matchItem, onOpen, renderLeft, renderRight, children }) {
  return (
    <article className={`kds-card tone-${tone} ${highlighted ? 'highlight' : ''}`}>
      <header className="kds-card-head">
        {onOpen
          ? <button type="button" className="kds-no" onClick={onOpen} title="Xem chi tiết đơn">{order.displayNumber}</button>
          : <span className="kds-no">{order.displayNumber}</span>}
        <span className="kds-place">{placeLabel(order)}</span>
        <span className="kds-time"><i className="bi bi-clock me-1" />{elapsedLabel(order.createdAt)}</span>
      </header>
      <ul className="kds-items">
        {items.map((i) => (
          <li key={i.id} className={matchItem?.(i) ? 'match' : ''}>
            {renderLeft?.(i)}
            <span className="order-qty">{i.quantity}×</span>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="fw-semibold">{i.itemName}</div>
              {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
              {i.note && <div className="order-note"><i className="bi bi-chat-left-text me-1" />{i.note}</div>}
            </div>
            {renderRight?.(i)}
          </li>
        ))}
      </ul>
      {order.customerNote && <div className="order-note px-3 pb-2"><i className="bi bi-info-circle me-1" />{order.customerNote}</div>}
      {children}
    </article>
  )
}
