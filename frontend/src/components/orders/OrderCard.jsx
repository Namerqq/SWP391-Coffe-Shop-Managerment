import Icon from "../Icon";
import { money } from "../../utils/format";
import { statuses } from "../../constants/orderStatus";
export default function OrderCard({
  order: o,
  loading,
  options,
  onEdit,
  onCancel,
}) {
  return (
    <article className="panel order-card">
      <div className="order-card-head">
        <div>
          <span className="order-id">
            ĐƠN #{o.id.toString().padStart(4, "0")}
          </span>
          <h2>{o.tableName}</h2>
          <p>
            {o.createdAt.replace("T", " ")} <span>·</span>{" "}
            {o.source === "STAFF" ? "Nhân viên đặt" : "Khách đặt tại bàn"}
          </p>
        </div>
        <span className={`badge ${o.status}`}>
          {statuses[o.status] || o.status}
        </span>
      </div>
      {!["CANCELLED", "REJECTED"].includes(o.status) && (
        <div className="order-progress">
          {[
            "PENDING_CONFIRMATION",
            "CONFIRMED",
            "PREPARING",
            "READY",
            "COMPLETED",
          ].map((s, i) => (
            <div
              key={s}
              className={
                i <=
                [
                  "PENDING_CONFIRMATION",
                  "CONFIRMED",
                  "PREPARING",
                  "READY",
                  "COMPLETED",
                ].indexOf(o.status)
                  ? "done"
                  : ""
              }
            >
              <span>{i + 1}</span>
              <small>{statuses[s]}</small>
            </div>
          ))}
        </div>
      )}
      <details>
        <summary>
          Chi tiết {o.items.reduce((s, x) => s + x.quantity, 0)} món{" "}
          <strong>{money(o.total)}</strong>
        </summary>
        <div className="order-lines">
          {o.items.map((i) => (
            <div key={i.id}>
              <div>
                <strong>
                  {i.quantity} × {i.name}
                </strong>
                <p>
                  Size {i.size} · Đường {i.sugar} · {i.ice}
                  {i.extras.length > 0
                    ? ` · ${i.extras.map((e) => e.name).join(", ")}`
                    : ""}
                </p>
                {i.note && <p>Ghi chú: {i.note}</p>}
              </div>
              <span>{money(i.subtotal)}</span>
            </div>
          ))}
        </div>
        {o.note && <p className="order-note-view">Ghi chú: {o.note}</p>}
      </details>
      {o.cancelReason && (
        <p className="cancel-note">Lý do hủy: {o.cancelReason}</p>
      )}
      {o.status === "PENDING_CONFIRMATION" && (
        <div className="order-actions">
          <span>
            <Icon name="clock" size={15} /> Chờ quán xác nhận
          </span>
          {onEdit && (
            <button
              className="button small secondary"
              disabled={loading || !options}
              onClick={() => onEdit(o)}
            >
              Sửa đơn
            </button>
          )}
          <button
            className="button small danger"
            onClick={() => {
              onCancel(o);
            }}
          >
            Hủy đơn
          </button>
        </div>
      )}
    </article>
  );
}
