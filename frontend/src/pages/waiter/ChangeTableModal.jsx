import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import staffApi from '../../api/staffApi'
import waiterApi from '../../api/waiterApi'
import { errorMessage } from '../../api/axiosClient'

/**
 * Modal đổi bàn cho khách (SRS #20 Change Table - Waiter).
 * Chuyển session của khách từ bàn hiện tại sang một bàn trống khác.
 */
export default function ChangeTableModal({ show, session, onClose, onSuccess }) {
  const [tables, setTables] = useState([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!show || !session) return
    setSelectedTableId(null)
    setError('')
    setLoadingTables(true)

    staffApi.getTables()
      .then((res) => {
        // Chỉ lấy các bàn trống (chưa có sessionId) và khác bàn hiện tại
        const vacantTables = (res.data || []).filter(
          (t) => t.tableId !== session.tableId && !t.sessionId
        )
        setTables(vacantTables)
        if (vacantTables.length > 0) {
          setSelectedTableId(vacantTables[0].tableId)
        }
      })
      .catch((e) => {
        setError(errorMessage(e, 'Không tải được danh sách bàn trống.'))
      })
      .finally(() => {
        setLoadingTables(false)
      })
  }, [show, session])

  if (!show || !session) return null

  const selectedTable = tables.find((t) => t.tableId === selectedTableId)

  const handleSubmit = async () => {
    if (!selectedTableId) {
      setError('Vui lòng chọn bàn muốn chuyển đến.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await waiterApi.changeTable(session.tableId, selectedTableId)
      onSuccess?.(selectedTable)
    } catch (e) {
      setError(errorMessage(e, 'Không thể đổi bàn. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      show
      title="Đổi bàn cho khách"
      size="md"
      onClose={submitting ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-light-soft" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || loadingTables || !selectedTableId}
          >
            {submitting && <span className="spinner-border spinner-border-sm me-2" />}
            Xác nhận đổi sang {selectedTable?.tableNumber || 'bàn mới'}
          </button>
        </>
      }
    >
      <div className="mb-3 p-3 bg-light rounded-3 border">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="cf-muted small">Bàn hiện tại:</span>
          <span className="fw-bold fs-6 text-primary">{session.tableNumber}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="cf-muted small">Mã lượt khách:</span>
          <span className="fw-medium small">{session.sessionCode}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <span className="cf-muted small">Số đơn hàng:</span>
          <span className="badge bg-secondary">{session.orders?.length || 0} đơn</span>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">
          Chọn bàn trống chuyển đến <span className="text-danger">*</span>
        </label>

        {loadingTables ? (
          <div className="text-center py-4">
            <span className="spinner-border spinner-border-sm text-primary me-2" />
            <span className="cf-muted small">Đang tải danh sách bàn trống...</span>
          </div>
        ) : tables.length === 0 ? (
          <div className="alert alert-warning py-2 mb-0 small">
            <i className="bi bi-exclamation-triangle me-1" />
            Hiện không còn bàn trống nào khả dụng để chuyển.
          </div>
        ) : (
          <div className="row g-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {tables.map((t) => {
              const isSelected = t.tableId === selectedTableId
              return (
                <div key={t.tableId} className="col-4 col-sm-3">
                  <button
                    type="button"
                    className={`btn w-100 py-2 d-flex flex-column align-items-center justify-content-center border ${
                      isSelected
                        ? 'btn-primary shadow-sm'
                        : 'btn-outline-secondary bg-white'
                    }`}
                    onClick={() => setSelectedTableId(t.tableId)}
                    disabled={submitting}
                  >
                    <span className="fw-bold fs-6">{t.tableNumber}</span>
                    <span className="small opacity-75" style={{ fontSize: '0.75rem' }}>Trống</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger py-2 mb-0 small">{error}</div>}

      <div className="form-text small mt-2">
        <i className="bi bi-info-circle me-1" />
        Khi đổi bàn, toàn bộ đơn hàng và thanh toán của khách sẽ tự động chuyển sang bàn mới.
      </div>
    </Modal>
  )
}
