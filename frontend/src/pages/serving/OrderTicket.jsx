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
        {items.map((i) => {
          const isRemake = i.remake // món đang làm lại vì phục vụ làm đổ / vỡ (backend gửi cờ, không gửi chi tiết)
          return (
            <li key={i.id} className={`${matchItem?.(i) ? 'match' : ''} ${isRemake ? 'border-start border-danger border-3 ps-2' : ''}`}>
              {renderLeft?.(i)}
              <span className="order-qty">{i.quantity}×</span>
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="fw-semibold d-flex align-items-center flex-wrap gap-1">
                  <span>{i.itemName}</span>
                  {isRemake && (
                    <span className="badge text-bg-danger" style={{ fontSize: '0.72rem' }}>
                      Pha bù (Làm vỡ)
                    </span>
                  )}
                </div>
                {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
                {i.note && (
                  <div className="order-note">{i.note}</div>
                )}
              </div>
              {renderRight?.(i)}
            </li>
          )
        })}
      </ul>
      {order.customerNote && <div className="order-note px-3 pb-2"><i className="bi bi-info-circle me-1" />{order.customerNote}</div>}
      {children}
    </article>
  )
}
