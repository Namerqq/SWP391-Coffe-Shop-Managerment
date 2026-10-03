import { useState } from "react";
import Icon from "./Icon";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useOrders } from "../context/OrdersContext";
import { useToast } from "../context/ToastContext";
export default function TableSelector() {
  const { staff, context, bindTable: selectTable } = useAuth();
  const { tableId, setTableId, editing, currentTable, tableBlocked } =
    useCart();
  const { tables } = useOrders();
  const { setNotice } = useToast();
  const [qrOpen, setQrOpen] = useState(false),
    [qrInput, setQrInput] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const bindTable = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const table = await selectTable(qrInput);
      setQrOpen(false);
      setNotice(`Đã chọn ${table.name}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="table-selection">
        <Icon name="table" />
        <div>
          <span>Phục vụ tại bàn</span>
          {staff ? (
            <select
              aria-label="Chọn bàn"
              value={tableId}
              disabled={!!editing}
              onChange={(e) => setTableId(Number(e.target.value))}
            >
              <option value="">Chọn bàn</option>
              {tables.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                  disabled={
                    t.status === "UNAVAILABLE" ||
                    t.sessionStatus === "PAYMENT_PENDING"
                  }
                >
                  {t.name}
                  {t.sessionStatus === "PAYMENT_PENDING"
                    ? " · Chờ thanh toán"
                    : ""}
                </option>
              ))}
            </select>
          ) : (
            <strong>{currentTable?.name || "Chưa chọn bàn"}</strong>
          )}
        </div>
        {!staff && !context?.fixedTable && (
          <button
            className="button subtle"
            onClick={() => {
              setError("");
              setQrOpen(true);
            }}
          >
            {currentTable ? "Đổi bàn" : "Nhập mã bàn"}
          </button>
        )}
      </div>

      {tableBlocked && (
        <div className="alert warning">
          Bàn đang ngừng phục vụ hoặc chờ thanh toán. Vui lòng chọn bàn khác
          hoặc liên hệ nhân viên.
        </div>
      )}
      {qrOpen && (
        <Modal
          title="Chọn bàn phục vụ"
          busy={busy}
          onClose={() => setQrOpen(false)}
        >
          <form onSubmit={bindTable}>
            <div className="modal-body">
              <p className="muted">
                Quét mã QR đặt trên bàn hoặc nhập mã bàn được quán cung cấp.
              </p>
              <label className="field">
                Mã QR của bàn
                <input
                  autoComplete="off"
                  required
                  maxLength={255}
                  placeholder="Ví dụ: TABLE-01"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                />
              </label>
              {error && (
                <div className="alert error" role="alert">
                  {error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setQrOpen(false)}
              >
                Quay lại
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Đang kiểm tra…" : "Xác nhận bàn"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
