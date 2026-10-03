import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import { errorMessage } from '../../api/axiosClient'
import usePolling from '../../utils/usePolling'
import { formatMoney, formatTime } from '../../utils/orderFormat'
import '../../styles/cashier.css'

// Cashier Dashboard — SRS 1.3.1. UC-C05 Process Payments, UC-C06 Search Bill by Table.
export default function CashierDashboard() {
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await staffApi.getTables()
      setTables(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được danh sách bàn.'))
    } finally {
      setLoading(false)
    }
  }, [])
  usePolling(load, 5000)

  const busy = tables.filter((t) => t.sessionId)

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Thanh toán</h1>
          <p className="page-subtitle">Bàn đang có khách. Bàn chỉ tính tiền được khi mọi đơn đã được phục vụ.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/cashier/tables" className="btn btn-light-soft"><i className="bi bi-grid-3x3-gap me-1" />Sơ đồ bàn</Link>
          <Link to="/cashier/takeaway" className="btn btn-primary"><i className="bi bi-bag me-1" />Bán mang đi</Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && tables.length === 0 && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}

      <div className="bill-grid">
        {busy.map((t) => {
          const payable = t.orderCount > 0 && t.unfinishedCount === 0
          return (
            <button type="button" key={t.tableId} className="cf-card bill-card" onClick={() => navigate(`/cashier/bill/${t.tableId}`)}>
              <div className="d-flex justify-content-between align-items-start gap-2">
                <span className="bill-table">{t.tableNumber}</span>
                <span className={`status-pill ${payable ? 'tone-ready' : 'tone-preparing'}`}>{payable ? 'Chờ thanh toán' : 'Đang phục vụ'}</span>
              </div>
              <div className="cell-sub">Vào lúc {formatTime(t.openedAt)}, {t.orderCount} đơn</div>
              <div className="bill-amount">{formatMoney(t.total)}</div>
              <div className={payable ? 'small fw-semibold bill-ok' : 'cell-sub'}>
                {payable ? 'Đã phục vụ xong, có thể thanh toán' : `${t.unfinishedCount} đơn chưa phục vụ xong`}
              </div>
            </button>
          )
        })}
      </div>

      {!loading && !error && busy.length === 0 && (
        <div className="cf-card empty-state">
          <i className="bi bi-cup-hot" />
          Chưa có bàn nào đang có khách. Khách mua mang đi thì bấm Bán mang đi.
        </div>
      )}
    </>
  )
}
