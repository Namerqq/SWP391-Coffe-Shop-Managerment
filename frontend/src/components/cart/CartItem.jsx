import Thumbnail from "../Thumbnail";
import Icon from "../Icon";
import Quantity from "../QuantityControl";
import { money } from "../../utils/format";
import { unitPrice } from "../../utils/orderPricing";
export default function CartItem({
  item,
  options,
  onCustomize,
  onQuantityChange,
  onRemove,
}) {
  return (
    <article className="cart-item">
      <Thumbnail item={item} />
      <div className="cart-item-main">
        <button
          className="item-name-button"
          disabled={!options}
          onClick={() => onCustomize(item)}
        >
          {item.name}
        </button>
        <p>
          Size {item.size} · Đường {item.sugar} · {item.ice}
        </p>
        {item.extras.length > 0 && <p>{item.extras.join(", ")}</p>}
        {item.note && <p className="note-text">{item.note}</p>}
        <button
          className="text-button"
          disabled={!options}
          onClick={() => onCustomize(item)}
        >
          Tùy chỉnh
        </button>
      </div>
      <div className="cart-item-price">
        <strong>
          {options ? money(unitPrice(item, options) * item.quantity) : "…"}
        </strong>
        <Quantity
          value={item.quantity}
          onChange={(quantity) => onQuantityChange(item.cartId, quantity)}
        />
      </div>
      <button
        className="icon-button"
        aria-label={`Xóa ${item.name}`}
        onClick={() => onRemove(item.cartId)}
      >
        <Icon name="trash" size={18} />
      </button>
    </article>
  );
}
