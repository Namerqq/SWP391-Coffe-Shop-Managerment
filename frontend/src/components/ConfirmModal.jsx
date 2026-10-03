import Modal from "./Modal";
export default function ConfirmModal({
  title,
  children,
  onClose,
  onConfirm,
  cancelLabel = "Quay lại",
  confirmLabel = "Xác nhận",
  busy = false,
}) {
  return (
    <Modal title={title} busy={busy} onClose={onClose}>
      <div className="modal-body">
        <p>{children}</p>
      </div>
      <div className="modal-footer">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          {cancelLabel}
        </button>
        <button className="button primary" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
