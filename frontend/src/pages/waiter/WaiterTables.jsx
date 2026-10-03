import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import { errorMessage } from '../../api/axiosClient'
import usePolling from '../../utils/usePolling'
import TableCard, { TABLE_FILTERS } from '../../components/order/TableCard'
import '../../styles/danmt.css'

// Waiter Dashboard & Table List — SRS 1.4.1. Bấm bàn có khách để xem / sửa đơn.
export default function WaiterTables() {
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await staffApi.getTables()
      setTables(res.data)
      setError('')
    } catch (e) {
      setError(errorMessage(e, 'Không tải được sơ đồ bàn.'))
    } finally {
      setLoading(false)
    }
  }, [])
  usePolling(load, 5000)

  const occupied = tables.filter((t) => t.sessionId).length
  const active = TABLE_FILTERS.find((f) => f.key === filter) || TABLE_FILTERS[0]
  const visible = tables.filter(active.test)

  return (
    <>
      <div className="mb-3">
        <h1 className="page-title">Sơ đồ bàn</h1>
        <p className="page-subtitle">{occupied}/{tables.length} bàn đang có khách</p>
      </div>

      <div className="chip-tabs mb-3" role="tablist" aria-label="Lọc bàn">
        {TABLE_FILTERS.map((f) => (
          <button type="button" role="tab" key={f.key} aria-selected={filter === f.key}
                  className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
            {f.label}<span className="chip-count">{tables.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && tables.length === 0 && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}

      <div className="table-grid">
        {visible.map((t) => (
          <TableCard key={t.tableId} table={t} onClick={() => navigate(`/waiter/tables/${t.tableId}`)} />
        ))}
      </div>

      {!loading && !error && visible.length === 0 && (
        <div className="cf-card empty-state">
          <i className="bi bi-grid-3x3-gap" />
          {tables.length === 0 ? 'Chưa có bàn nào. Quản lý thêm bàn ở Quản lý bàn.' : 'Không có bàn nào khớp bộ lọc.'}
        </div>
      )}
    </>
  )
}
