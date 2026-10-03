import Modal from "../Modal";
export default function CancelOrderModal({
  cancel,
  cancelReason,
  setCancelReason,
  error,
  busy,
  onClose,
  onSubmit,
}) {
  return (
    <Modal
      title={`Hủy đơn #${cancel.id}`}
      busy={busy}
      onClose={() => onClose()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="modal-body">
          <p className="muted">
            Đơn sẽ được hủy nếu quán chưa xác nhận. Bạn có thể đặt lại từ thực
            đơn.
          </p>
          <label className="field">
            Lý do hủy
            <textarea
              required
              maxLength={500}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy đơn…"
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
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() => onClose()}
          >
            Giữ đơn
          </button>
          <button
            className="button danger-fill"
            disabled={busy || !cancelReason.trim()}
          >
            {busy ? "Đang hủy…" : "Xác nhận hủy"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
