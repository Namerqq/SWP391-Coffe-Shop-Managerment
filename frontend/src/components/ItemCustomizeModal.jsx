import { useState } from "react";
import { money } from "../utils/format";
import { unitPrice } from "../utils/orderPricing";
import Modal from "./Modal";
import Thumbnail from "./Thumbnail";
import Quantity from "./QuantityControl";
export default function ItemCustomizeModal({
  drink,
  options,
  onClose,
  onSave,
}) {
  const [item, setItem] = useState({
    size: "M",
    sugar: "100%",
    ice: "Bình thường",
    extras: [],
    quantity: 1,
    note: "",
    ...drink,
  });
  const set = (key, value) => setItem((old) => ({ ...old, [key]: value }));
  return (
    <Modal title="Tùy chỉnh món" onClose={onClose}>
      <div className="modal-body">
        <div className="customize-item">
          <Thumbnail item={drink} />
          <div>
            <h3>{drink.name}</h3>
            <p>{drink.description}</p>
            <strong>{money(drink.price)}</strong>
          </div>
        </div>
        {[
          ["size", "Kích cỡ", ["M", "L"]],
          ["sugar", "Mức đường", ["0%", "50%", "100%"]],
          ["ice", "Lượng đá", ["Không đá", "Ít đá", "Bình thường"]],
        ].map(([key, label, values]) => (
          <fieldset key={key}>
            <legend>{label}</legend>
            <div className="options-row">
              {values.map((value) => (
                <button
                  key={value}
                  className={item[key] === value ? "selected" : ""}
                  aria-pressed={item[key] === value}
                  onClick={() => set(key, value)}
                >
                  {value}
                  {key === "size" && (
                    <small>
                      {value === "M"
                        ? "Tiêu chuẩn"
                        : `+${money(options.largeSizePrice)}`}
                    </small>
                  )}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <fieldset>
          <legend>
            Topping <span>Không bắt buộc</span>
          </legend>
          {options.extras.map((extra) => (
            <label className="extra-line" key={extra.name}>
              <span>
                <input
                  type="checkbox"
                  checked={item.extras.includes(extra.name)}
                  onChange={(e) =>
                    set(
                      "extras",
                      e.target.checked
                        ? [...item.extras, extra.name]
                        : item.extras.filter((x) => x !== extra.name),
                    )
                  }
                />
                {extra.name}
              </span>
              <span>+{money(extra.price)}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          Ghi chú món
          <textarea
            maxLength={300}
            value={item.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Ví dụ: để đá riêng…"
          />
        </label>
      </div>
      <div className="modal-footer">
        <Quantity
          value={item.quantity}
          onChange={(value) => set("quantity", value)}
        />
        <button className="button primary" onClick={() => onSave(item)}>
          {item.cartId ? "Lưu thay đổi" : "Thêm vào giỏ"} ·{" "}
          {money(unitPrice(item, options) * item.quantity)}
        </button>
      </div>
    </Modal>
  );
}
