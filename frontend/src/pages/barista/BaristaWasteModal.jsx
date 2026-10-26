import { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import baristaApi from '../../api/baristaApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'

/**
 * UC-B06-Advanced: Biên bản sự cố hao hụt nguyên liệu tại quầy Barista.
 * Phân định Khách quan (Cửa hàng chịu) vs Chủ quan (Quy trách nhiệm bồi thường).
 */
export default function BaristaWasteModal({ show, item, onClose, onSuccess }) {
  const toast = useToast()

  const [quantity, setQuantity] = useState('')
  const [causeType, setCauseType] = useState('OBJECTIVE') // 'OBJECTIVE' | 'SUBJECTIVE'
  const [responsibleUserId, setResponsibleUserId] = useState('')
  const [compensationPercentage, setCompensationPercentage] = useState(50)
  const [note, setNote] = useState('')
  const [evidenceImageUrl, setEvidenceImageUrl] = useState('')

  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Tải danh sách nhân viên để chọn quy trách nhiệm khi chọn lỗi chủ quan
  useEffect(() => {
    if (show) {
      setQuantity('')
      setCauseType('OBJECTIVE')
      setResponsibleUserId('')
      setCompensationPercentage(50)
      setNote('')
      setEvidenceImageUrl('')

      setLoadingStaff(true)
      baristaApi
        .getStaffList()
        .then((res) => {
          setStaffList(res.data || [])
          if (res.data && res.data.length > 0) {
            setResponsibleUserId(String(res.data[0].id))
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStaff(false))
    }
  }, [show])

  if (!item) return null

  const unitCost = Number(item.unitCost) || 0
  const numQty = parseFloat(quantity) || 0
  const totalLoss = Math.round(numQty * unitCost)
  const compensationAmount =
    causeType === 'SUBJECTIVE' ? Math.round((totalLoss * compensationPercentage) / 100) : 0

  const handleSubmit = async (e) => {
    e?.preventDefault()

    if (!numQty || numQty <= 0) {
      toast('Vui lòng nhập số lượng hao hụt lớn hơn 0', 'warning')
      return
    }

    if (numQty > Number(item.currentQuantity)) {
      toast(
        `Số lượng hao hụt (${numQty}) không được vượt quá số tồn kho hiện tại (${item.currentQuantity} ${item.unit})`,
        'warning'
      )
      return
    }

    if (causeType === 'SUBJECTIVE') {
      if (!responsibleUserId) {
        toast('Vui lòng chọn nhân viên chịu trách nhiệm sự cố', 'warning')
        return
      }
      if (compensationPercentage < 0 || compensationPercentage > 100) {
        toast('Tỷ lệ bồi thường phải từ 0% đến 100%', 'warning')
        return
      }
    }

    if (!note || note.trim().length < 5) {
      toast('Vui lòng nhập giải trình sự cố rõ ràng (tối thiểu 5 ký tự)', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        quantity: numQty,
        note: note.trim(),
        causeType,
        responsibleUserId: causeType === 'SUBJECTIVE' ? Number(responsibleUserId) : null,
        compensationPercentage: causeType === 'SUBJECTIVE' ? Number(compensationPercentage) : 0,
        evidenceImageUrl: evidenceImageUrl.trim() || null,
      }

      await baristaApi.reportWaste(item.id, payload)
      toast(
        `Đã lập biên bản sự cố và khấu trừ ${numQty} ${item.unit} ${item.itemName} vào kho!`,
        'success'
      )
      onSuccess?.()
      onClose?.()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      show={show}
      title={
        <div className="d-flex align-items-center gap-2 text-danger">
          <i className="bi bi-shield-exclamation fs-5" />
          <span>Biên bản sự cố & Báo hao hụt nguyên liệu</span>
        </div>
      }
      size="lg"
      onClose={onClose}
      footer={
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="small text-muted">
            <i className="bi bi-exclamation-circle text-warning me-1" />
            Tồn kho sẽ bị trừ ngay và lưu thẻ kho làm căn cứ đối soát.
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-light-soft btn-sm"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm fw-semibold shadow-sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" /> Đang ghi nhận...
                </>
              ) : (
                <>
                  <i className="bi bi-clipboard2-check me-1" /> Xác nhận biên bản sự cố
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Thẻ tóm tắt thông tin nguyên liệu và giá vốn */}
        <div className="card border-0 bg-light-subtle rounded-3 p-3 mb-3 border">
          <div className="row g-2 align-items-center">
            <div className="col-sm-5">
              <div className="small text-muted">Nguyên liệu sự cố:</div>
              <div className="fw-bold text-dark fs-6">{item.itemName}</div>
              <div className="small text-muted">
                Tồn hiện tại:{' '}
                <span className="fw-semibold text-primary">
                  {Number(item.currentQuantity).toLocaleString('vi-VN')} {item.unit}
                </span>
              </div>
            </div>
            <div className="col-sm-3 text-sm-center">
              <div className="small text-muted">Đơn giá vốn:</div>
              <div className="fw-bold text-secondary">
                {unitCost > 0 ? `${unitCost.toLocaleString('vi-VN')} đ/${item.unit}` : 'Chưa có'}
              </div>
            </div>
            <div className="col-sm-4 text-sm-end">
              <div className="small text-muted">Ước tính thiệt hại:</div>
              <div className="fw-bold text-danger fs-5">
                {totalLoss > 0 ? `${totalLoss.toLocaleString('vi-VN')} đ` : '0 đ'}
              </div>
            </div>
          </div>
        </div>

        {/* Số lượng hao hụt */}
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small text-uppercase">
            Số lượng hư hỏng / hao hụt ({item.unit}) <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={Number(item.currentQuantity)}
              className="form-control form-control-lg fw-bold text-danger"
              placeholder={`Tối đa ${item.currentQuantity}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={submitting}
              required
            />
            <span className="input-group-text fw-semibold bg-light">{item.unit}</span>
          </div>
          <div className="form-text small">
            Nhập số lượng thực tế bị đổ vỡ, cháy khét, hư hỏng hoặc quá hạn cần hủy.
          </div>
        </div>

        {/* Phân loại nguyên nhân sự cố */}
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small text-uppercase">
            Phân loại nguyên nhân <span className="text-danger">*</span>
          </label>
          <div className="row g-2">
            <div className="col-md-6">
              <div
                className={`card p-3 h-100 cursor-pointer border ${
                  causeType === 'OBJECTIVE'
                    ? 'border-primary bg-primary-subtle shadow-sm'
                    : 'border-secondary-subtle bg-white'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setCauseType('OBJECTIVE')}
              >
                <div className="form-check m-0">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="causeType"
                    id="causeObjective"
                    checked={causeType === 'OBJECTIVE'}
                    onChange={() => setCauseType('OBJECTIVE')}
                  />
                  <label
                    className="form-check-label fw-bold text-dark cursor-pointer ms-1"
                    htmlFor="causeObjective"
                  >
                    1. Khách quan (Cửa hàng chịu phí)
                  </label>
                </div>
                <div className="small text-muted mt-2 ps-4">
                  Sự cố thiết bị (mất điện tủ lạnh, rơi giá kệ do yếu), hàng cận hạn nhà cung cấp giao
                  hoặc nguyên liệu biến chất ngoài ý muốn.
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div
                className={`card p-3 h-100 cursor-pointer border ${
                  causeType === 'SUBJECTIVE'
                    ? 'border-danger bg-danger-subtle shadow-sm'
                    : 'border-secondary-subtle bg-white'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setCauseType('SUBJECTIVE')}
              >
                <div className="form-check m-0">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="causeType"
                    id="causeSubjective"
                    checked={causeType === 'SUBJECTIVE'}
                    onChange={() => setCauseType('SUBJECTIVE')}
                  />
                  <label
                    className="form-check-label fw-bold text-danger cursor-pointer ms-1"
                    htmlFor="causeSubjective"
                  >
                    2. Chủ quan (Quy trách nhiệm bồi hoàn)
                  </label>
                </div>
                <div className="small text-muted mt-2 ps-4">
                  Sơ suất làm rơi vỡ, pha sai công thức phải đổ bỏ, quên đậy nắp gây ẩm mốc, làm cháy khét
                  nguyên liệu khi sấy/đun.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Khung quy trách nhiệm (Hiển thị khi lỗi Chủ quan) */}
        {causeType === 'SUBJECTIVE' && (
          <div className="card border-danger border-opacity-50 bg-danger-subtle rounded-3 p-3 mb-3">
            <div className="fw-semibold text-danger small text-uppercase mb-2 d-flex align-items-center gap-1">
              <i className="bi bi-person-fill-exclamation" /> Thông tin quy trách nhiệm & Bồi thường
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark">
                  Nhân viên chịu trách nhiệm <span className="text-danger">*</span>
                </label>
                {loadingStaff ? (
                  <div className="small text-muted py-1">Đang tải danh sách nhân viên...</div>
                ) : (
                  <select
                    className="form-select form-select-sm"
                    value={responsibleUserId}
                    onChange={(e) => setResponsibleUserId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.role} - {st.username})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark d-flex justify-content-between">
                  <span>Tỷ lệ bồi hoàn (%)</span>
                  <span className="fw-bold text-danger">{compensationPercentage}%</span>
                </label>
                <div className="d-flex gap-1 mb-1">
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className={`btn btn-xs flex-fill py-0 fs-8 ${
                        compensationPercentage === pct
                          ? 'btn-danger active fw-bold'
                          : 'btn-outline-danger'
                      }`}
                      onClick={() => setCompensationPercentage(pct)}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="100"
                  step="5"
                  value={compensationPercentage}
                  onChange={(e) => setCompensationPercentage(Number(e.target.value))}
                />
              </div>

              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center p-2 bg-white rounded-2 border border-danger-subtle">
                  <span className="small text-muted">
                    Khấu trừ đối soát dự kiến: ({totalLoss.toLocaleString('vi-VN')} đ ×{' '}
                    {compensationPercentage}%)
                  </span>
                  <span className="fw-bold text-danger fs-6">
                    {compensationAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Giải trình lý do */}
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small text-uppercase">
            Giải trình chi tiết sự cố <span className="text-danger">*</span>
          </label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="Mô tả cụ thể diễn biến sự việc: thời gian xảy ra, nguyên nhân, biện pháp khắc phục tức thời..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        {/* Link ảnh hiện trường / bằng chứng */}
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark small text-uppercase">
            Đường dẫn ảnh chứng cứ / hiện trường (nếu có)
          </label>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light text-muted">
              <i className="bi bi-camera" />
            </span>
            <input
              type="url"
              className="form-control"
              placeholder="https://example.com/anh-su-co.jpg"
              value={evidenceImageUrl}
              onChange={(e) => setEvidenceImageUrl(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="form-text small">
            Dán đường dẫn ảnh hiện trường để tiện đối soát tài chính khi cần.
          </div>
        </div>
      </form>
    </Modal>
  )
}
