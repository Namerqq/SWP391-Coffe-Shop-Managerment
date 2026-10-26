import { useEffect, useState } from 'react'
import inventoryApi from '../../api/inventoryApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime } from '../../utils/format'

export default function StockHistoryModal({ show, onClose, item }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (show && item) {
      setLoading(true)
      setError(null)
      inventoryApi.history(item.id)
        .then(res => setHistory(res.data))
        .catch(err => setError(errorMessage(err)))
        .finally(() => setLoading(false))
    }
  }, [show, item])

  if (!show || !item) return null

  const getBadge = (type) => {
    switch (type) {
      case 'STOCK_IN':
        return <span className="cf-badge badge-active"><i className="bi bi-box-arrow-in-down me-1" />Nhập kho</span>
      case 'ADJUSTMENT':
        return <span className="cf-badge badge-locked" style={{ background: '#fef3c7', color: '#b45309' }}><i className="bi bi-sliders me-1" />Cân chỉnh</span>
      case 'WASTE':
        return <span className="cf-badge badge-locked" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="bi bi-trash3 me-1" />Hao hụt/Hỏng</span>
      case 'STOCK_OUT':
        return <span className="cf-badge badge-locked" style={{ background: '#ffedd5', color: '#c2410c' }}><i className="bi bi-box-arrow-up me-1" />Xuất kho</span>
      default:
        return <span className="cf-badge badge-active">{type}</span>
    }
  }

  return (
    <>
      <div className="cf-modal-backdrop" onClick={onClose} />
      <div className="cf-modal modal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header border-0 pb-0">
              <div>
                <h5 className="modal-title mb-1">
                  <i className="bi bi-clock-history me-2 text-primary" />
                  Lịch sử giao dịch: <span className="fw-bold">{item.itemName}</span>
                </h5>
                <p className="text-muted small mb-0">
                  Tồn hiện tại: <span className="fw-semibold text-dark">{Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit}</span>
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body py-3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary spinner-border-sm me-2" />
                  Đang tải lịch sử...
                </div>
              ) : error ? (
                <div className="alert alert-danger mb-0">{error}</div>
              ) : history.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-journal-x fs-3 d-block mb-2 text-secondary" />
                  Chưa có giao dịch nhập / xuất kho nào được ghi nhận.
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '400px' }}>
                  <table className="table cf-table mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Loại giao dịch</th>
                        <th className="text-end">Số lượng</th>
                        <th>Lý do & Ghi chú</th>
                        <th>Người thực hiện</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((tx) => (
                        <tr key={tx.id}>
                          <td className="small text-muted text-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </td>
                          <td>{getBadge(tx.transactionType)}</td>
                          <td className="text-end fw-bold text-nowrap">
                            {tx.transactionType === 'STOCK_IN' ? (
                              <span className="text-success">+{Number(tx.quantity).toLocaleString('vi-VN')} {item.unit}</span>
                            ) : (
                              <span className="text-danger">-{Number(tx.quantity).toLocaleString('vi-VN')} {item.unit}</span>
                            )}
                          </td>
                          <td className="small">
                            <div>{tx.reason || '—'}</div>
                            {tx.note && <div className="text-muted fst-italic">{tx.note}</div>}
                          </td>
                          <td className="small text-nowrap">
                            <i className="bi bi-person-circle me-1 text-secondary" />
                            {tx.createdByName || 'Hệ thống'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light-soft" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
