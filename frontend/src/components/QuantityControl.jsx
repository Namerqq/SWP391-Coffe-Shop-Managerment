import Icon from "./Icon";
export default function QuantityControl({ value, onChange }) {
  return (
    <div className="quantity">
      <button
        aria-label="Giảm số lượng"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Icon name="minus" size={15} />
      </button>
      <span>{value}</span>
      <button
        aria-label="Tăng số lượng"
        disabled={value >= 50}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="plus" size={15} />
      </button>
    </div>
  );
}
