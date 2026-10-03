import Modal from './Modal'

// Hộp xác nhận cho các thao tác quan trọng (vô hiệu hóa, xóa...).
export default function ConfirmModal({ show, title, message, confirmText = 'Xác nhận', danger, loading, onConfirm, onClose }) {
  return (
    <Modal
      show={show}
      title={title}
      onClose={loading ? undefined : onClose}
      footer={
        <>
          <button className="btn btn-light-soft" onClick={onClose} disabled={loading}>Hủy</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading && <span className="spinner-border spinner-border-sm me-2" />}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="cf-muted" style={{ fontSize: '0.95rem' }}>{message}</div>
    </Modal>
  )
}
