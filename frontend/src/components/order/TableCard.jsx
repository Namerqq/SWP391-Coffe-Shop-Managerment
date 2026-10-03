import { formatMoney, formatTime } from '../../utils/orderFormat'

/** Trạng thái 1 bàn trên sơ đồ: vacant | ready | busy | served (đã phục vụ hết, chờ thanh toán). */
export function tableState(t) {
  if (!t.sessionId) return 'vacant'
  if (t.readyCount > 0) return 'ready'
  if (t.unfinishedCount > 0) return 'busy'
  return 'served'
}

/** Bộ lọc sơ đồ bàn (SRS 1.3.4 / 1.4.1). */
export const TABLE_FILTERS = [
  { key: 'ALL', label: 'Tất cả', test: () => true },
  { key: 'BUSY', label: 'Có khách', test: (t) => !!t.sessionId },
  { key: 'READY', label: 'Có món chờ mang ra', test: (t) => t.readyCount > 0 },
  { key: 'VACANT', label: 'Bàn trống', test: (t) => !t.sessionId },
]

/** 1 ô bàn (dùng chung Phục vụ + Thu ngân). Bàn trống không bấm được. */
export default function TableCard({ table: t, onClick }) {
  const state = tableState(t)
  const vacant = state === 'vacant'
  return (
    <button type="button" className={`table-card state-${state === 'served' ? 'busy' : state}`}
            disabled={vacant} onClick={vacant ? undefined : onClick}>
      <div className="d-flex justify-content-between align-items-start gap-2 w-100">
        <span className="table-no">{t.tableNumber}</span>
        {vacant
          ? <span className="cf-muted small">Trống</span>
          : <span className={`status-pill ${state === 'served' ? 'tone-ready' : 'tone-preparing'}`}>
              {state === 'served' ? 'Chờ thanh toán' : 'Đang phục vụ'}
            </span>}
      </div>
      {vacant ? (
        <div className="cf-muted small mt-auto">Chưa có khách</div>
      ) : (
        <>
          <div className="cf-muted small mt-1">Vào lúc {formatTime(t.openedAt)}</div>
          <div className="d-flex flex-wrap gap-1 my-2">
            {t.waitingCount > 0 && <span className="status-pill tone-pending">{t.waitingCount} chờ pha</span>}
            {t.preparingCount > 0 && <span className="status-pill tone-preparing">{t.preparingCount} đang pha</span>}
            {t.readyCount > 0 && <span className="status-pill tone-ready">{t.readyCount} chờ mang ra</span>}
          </div>
          <div className="table-total">{formatMoney(t.total)}</div>
        </>
      )}
    </button>
  )
}
