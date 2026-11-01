import { useCallback, useEffect, useState } from 'react'
import refundApi from '../../api/refundApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime } from '../../utils/format'
import { formatMoney } from '../../utils/orderFormat'
import { REFUND_METHOD, refundStatus, todayString } from '../cashier/refundFormat'

const BADGE = { REFUNDED: 'text-bg-success', REFUND_PENDING: 'bg-warning text-dark' }

// Quản lý hậu kiểm hoàn tiền (ThangNN Iter3): chỉ xem ai hoàn, cho đơn nào, bao nhiêu, lý do gì.
// Thu ngân hoàn ngay tại quầy (không chờ duyệt); quản lý xem lại ở đây. Mặc định 7 ngày gần nhất.

const TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'REFUNDED', label: 'Đã hoàn' },
  { key: 'REFUND_PENDING', label: 'Chờ chuyển khoản' },
]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function ManagerRefundList() {
  const today = todayString()
  const [from, setFrom] = useState(daysAgo(6))
  const [to, setTo] = useState(today)
  const [tab, setTab] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await refundApi.getReport({ from, to })
      setData(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách hoàn tiền.'))
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const rows = (data?.refunds || []).filter((r) => !tab || r.status === tab)

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="page-title">Hoàn tiền</h1>
          <p className="page-subtitle">
            Thu ngân hoàn tiền ngay tại quầy, không chờ duyệt. Xem lại ai hoàn, cho đơn nào, bao nhiêu và lý do.
          </p>
        </div>
        <button className="btn btn-light-soft btn-sm" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </button>
      </div>

      <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
        <div>
          <label className="form-label small mb-1" htmlFor="refund-from">Từ ngày</label>
          <input id="refund-from" type="date" className="form-control" value={from} max={to}
                 onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label small mb-1" htmlFor="refund-to">Đến ngày</label>
          <input id="refund-to" type="date" className="form-control" value={to} min={from} max={today}
                 onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
        <ul className="nav nav-pills cf-filter-pills ms-lg-3">
          {TABS.map((t) => (
            <li className="nav-item" key={t.key}>
              <button className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            </li>
          ))}
        </ul>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {data && (
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-lg-4">
            <div className="cf-card p-3 h-100">
              <div className="cf-muted small mb-1">Đã trả lại khách</div>
              <div className="fs-4 fw-bold">{formatMoney(data.refundedTotal)}</div>
              <div className="small text-muted">Đã trừ vào doanh thu theo giờ trả</div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-4">
            <div className="cf-card p-3 h-100">
              <div className="cf-muted small mb-1">Đang chờ chuyển khoản</div>
              <div className="fs-4 fw-bold">{formatMoney(data.pendingTotal)}</div>
              <div className="small text-muted">{data.count} phiếu trong khoảng đang xem</div>
            </div>
          </div>
        </div>
      )}

      <div className="cf-card p-0 overflow-hidden shadow-sm">
        {loading && !data ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state py-5">
            <i className="bi bi-arrow-counterclockwise fs-1 text-muted" />
            <div className="mt-2 text-muted">Không có phiếu hoàn nào trong khoảng này</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Thu ngân</th>
                  <th>Đơn</th>
                  <th>Nội dung</th>
                  <th className="text-end">Trả khách</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = refundStatus(r)
                  return (
                    <tr key={r.id}>
                      <td className="text-nowrap">
                        <div>{formatDateTime(r.createdAt)}</div>
                        <div className="cell-sub">{r.refundCode}</div>
                      </td>
                      <td className="fw-semibold">{r.cashierName || '—'}</td>
                      <td>
                        <div>{r.place} · {r.fulfillmentType === 'DELIVERY' ? r.orderNumber : r.displayNumber}</div>
                        <div className="cell-sub">Hóa đơn {r.paymentCode}, khách trả {formatMoney(r.paidAmount)}</div>
                      </td>
                      <td className="small" style={{ maxWidth: 360 }}>{r.note}</td>
                      <td className="text-end text-nowrap">
                        <div className="fw-semibold">{formatMoney(r.amount)}</div>
                        <div className="cell-sub">{REFUND_METHOD[r.method] || r.method}</div>
                      </td>
                      <td>
                        <span className={`badge ${BADGE[r.status] || 'text-bg-secondary'}`}>{st.label}</span>
                        {r.refundedAt && <div className="cell-sub mt-1">{formatDateTime(r.refundedAt)}</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
