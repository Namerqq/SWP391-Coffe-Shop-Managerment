import { useEffect, useState } from 'react'
import incidentApi from '../../api/incidentApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'
import { formatDateTime } from '../../utils/format'
import IncidentReviewModal from './IncidentReviewModal'

const TABS = [
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'REVIEWED', label: 'Đã xử lý' },
  { key: '', label: 'Tất cả' },
]

const ACTION_LABEL = {
  REMAKE: 'Khách muốn làm lại',
  CANCEL: 'Khách không làm lại',
}

// Quản lý: xem biên bản sự cố đổ / vỡ món của phục vụ và quyết định mức phạt.
export default function IncidentReportList() {
  const [tab, setTab] = useState('PENDING')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(null) // biên bản đang mở để nhập mức phạt

  const load = async () => {
    setLoading(true)
    try {
      const res = await incidentApi.getAll(tab)
      setReports(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách sự cố.'))
    } finally {
      setLoading(false)
    }
  }

  // Tải lại mỗi khi đổi tab
  useEffect(() => {
    load()
  }, [tab])

  // Quản lý lưu mức phạt xong: thay biên bản cũ bằng biên bản mới server trả về
  const handleReviewed = (updated) => {
    if (tab === 'PENDING') {
      setReports(reports.filter((r) => r.id !== updated.id))
    } else {
      setReports(reports.map((r) => (r.id === updated.id ? updated : r)))
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="page-title">Sự cố đổ / vỡ món</h1>
          <p className="page-subtitle">
            Biên bản do phục vụ báo khi làm đổ / vỡ món. Xem xét và nhập mức phạt phù hợp (nhập 0 nếu không phạt).
          </p>
        </div>
        <button className="btn btn-light-soft btn-sm" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </button>
      </div>

      <ul className="nav nav-pills cf-filter-pills mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="cf-card p-0 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : reports.length === 0 ? (
          <div className="empty-state py-5">
            <i className="bi bi-cup fs-1 text-muted" />
            <div className="mt-2 text-muted">Không có biên bản sự cố nào</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Phục vụ</th>
                  <th>Món</th>
                  <th>Nguyên nhân</th>
                  <th>Hướng xử lý</th>
                  <th className="text-end">Mức phạt</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="text-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="fw-semibold">{r.reporterName}</td>
                    <td>
                      <div className="fw-semibold">{r.quantity}× {r.itemName}</div>
                      <div className="cell-sub">
                        {r.tableNumber || 'Không rõ bàn'} · Đơn {r.displayNumber} · {formatMoney(r.itemValue)}
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}>{r.reason}</td>
                    <td className="text-nowrap">
                      <span className={`badge ${r.action === 'REMAKE' ? 'text-bg-primary' : 'text-bg-secondary'}`}>
                        {ACTION_LABEL[r.action] || r.action}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      {r.status === 'REVIEWED' ? (
                        <>
                          <div className="fw-semibold">{r.penaltyAmount > 0 ? formatMoney(r.penaltyAmount) : 'Không phạt'}</div>
                          {r.managerNote && <div className="cell-sub">{r.managerNote}</div>}
                          <div className="cell-sub">{r.reviewerName}, {formatDateTime(r.reviewedAt)}</div>
                        </>
                      ) : (
                        <span className="badge bg-warning text-dark">Chờ xử lý</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary text-nowrap" onClick={() => setReviewing(r)}>
                        {r.status === 'REVIEWED' ? 'Sửa' : 'Xử lý'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <IncidentReviewModal
        report={reviewing}
        onClose={() => setReviewing(null)}
        onSuccess={handleReviewed}
      />
    </div>
  )
}
