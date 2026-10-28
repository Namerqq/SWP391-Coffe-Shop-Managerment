import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import revenueApi from '../../api/revenueApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'
import '../../styles/revenue.css'

// UC-RP01 View Order Statistics — Quản lý xem doanh thu theo ngày / tuần / tháng / năm.
// Doanh thu = tiền đã thu theo hóa đơn (đã trừ giảm giá bằng điểm), tính theo giờ thu tiền.
// Gồm: thẻ tổng quan, biểu đồ cột, bảng thống kê chia theo giờ / ngày / tháng và top món bán chạy.

const PERIODS = [
  { value: 'DAY', label: 'Ngày', prev: 'Hôm qua', rowHead: 'Giờ' },
  { value: 'WEEK', label: 'Tuần', prev: 'Tuần trước', rowHead: 'Ngày' },
  { value: 'MONTH', label: 'Tháng', prev: 'Tháng trước', rowHead: 'Ngày' },
  { value: 'YEAR', label: 'Năm', prev: 'Năm trước', rowHead: 'Tháng' },
]

/** Date -> yyyy-mm-dd theo giờ máy. */
function isoDate(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Lùi / tiến 1 kỳ từ ngày đang chọn. */
function shiftDate(iso, period, step) {
  const d = parseDate(iso)
  if (period === 'DAY') d.setDate(d.getDate() + step)
  if (period === 'WEEK') d.setDate(d.getDate() + 7 * step)
  if (period === 'MONTH') d.setMonth(d.getMonth() + step, 1)
  if (period === 'YEAR') d.setFullYear(d.getFullYear() + step, 0, 1)
  return isoDate(d)
}

const dm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7)
const dmy = (iso) => `${dm(iso)}/${iso.slice(0, 4)}`

function periodTitle(data) {
  if (data.period === 'DAY') return `Ngày ${dmy(data.from)}`
  if (data.period === 'WEEK') return `Tuần ${dm(data.from)} – ${dmy(data.to)}`
  if (data.period === 'MONTH') return `Tháng ${data.from.slice(5, 7)}/${data.from.slice(0, 4)}`
  return `Năm ${data.from.slice(0, 4)}`
}

/** Nhãn ngắn dưới cột biểu đồ: "08h", "T2", "15", "T10". */
function shortLabel(period, label) {
  if (period === 'DAY') return label.slice(0, 2) + 'h'
  if (period === 'WEEK') return label.split(' ')[0]
  if (period === 'MONTH') return String(Number(label.slice(0, 2)))
  return 'T' + label.replace('Tháng ', '')
}

/** Số tiền gọn cho trục biểu đồ: 1,2tr / 500k. */
function compactMoney(n) {
  if (n >= 1000000) return `${(n / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

/** Làm tròn mức cao nhất của trục lên số đẹp (1, 2, 5 × 10^n). */
function niceMax(n) {
  if (n <= 0) return 0
  const pow = 10 ** Math.floor(Math.log10(n))
  return [1, 2, 5, 10].map((s) => s * pow).find((v) => v >= n)
}

export default function RevenueReport() {
  const [params, setParams] = useSearchParams()
  const today = isoDate(new Date())
  const period = PERIODS.some((p) => p.value === params.get('period')) ? params.get('period') : 'DAY'
  const date = params.get('date') || today
  const cfg = PERIODS.find((p) => p.value === period)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestNo = useRef(0)

  const load = useCallback(async () => {
    const no = ++requestNo.current
    setLoading(true)
    try {
      const res = await revenueApi.getReport(period, date === today ? null : date)
      if (no !== requestNo.current) return // đã đổi sang kỳ khác
      setData(res.data)
      setError('')
    } catch (e) {
      if (no !== requestNo.current) return
      setData(null)
      setError(errorMessage(e, 'Không tải được số liệu doanh thu.'))
    } finally {
      if (no === requestNo.current) setLoading(false)
    }
  }, [period, date, today])

  useEffect(() => { load() }, [load])

  const go = (nextPeriod, nextDate) => {
    const d = nextDate > today ? today : nextDate
    const p = {}
    if (nextPeriod !== 'DAY') p.period = nextPeriod
    if (d !== today) p.date = d
    setParams(p, { replace: true })
  }

  // Kỳ đang xem chứa hôm nay = chưa kết thúc -> không tiến tiếp được, không so % với kỳ trước.
  const isCurrent = data ? data.to >= today : true
  const sum = data?.summary

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Doanh thu</h1>
          <p className="page-subtitle mb-0">
            Tiền đã thu theo hóa đơn (đã trừ giảm giá bằng điểm), tính theo giờ thu tiền.
          </p>
        </div>
        <button type="button" className="btn btn-light-soft" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />Tải lại
        </button>
      </div>

      <div className="cf-card d-flex flex-wrap align-items-center gap-2 p-3 mb-3">
        <div className="d-flex gap-1" role="tablist" aria-label="Xem theo">
          {PERIODS.map((p) => (
            <button key={p.value} type="button" role="tab" aria-selected={p.value === period}
                    className={`filter-btn ${p.value === period ? 'active' : ''}`} onClick={() => go(p.value, date)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="d-flex align-items-center gap-1 ms-md-auto">
          <button type="button" className="btn btn-light-soft btn-icon" aria-label="Kỳ trước"
                  onClick={() => go(period, shiftDate(date, period, -1))}>
            <i className="bi bi-chevron-left" />
          </button>
          <span className="rv-period-title">{data ? periodTitle(data) : '…'}</span>
          <button type="button" className="btn btn-light-soft btn-icon" aria-label="Kỳ sau" disabled={isCurrent}
                  onClick={() => go(period, shiftDate(date, period, 1))}>
            <i className="bi bi-chevron-right" />
          </button>
          <input type="date" className="form-control ms-1" style={{ width: 'auto' }} value={date} max={today}
                 onChange={(e) => e.target.value && go(period, e.target.value)} aria-label="Chọn ngày trong kỳ" />
          {!isCurrent && (
            <button type="button" className="btn btn-light-soft" onClick={() => go(period, today)}>Hiện tại</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && !data && !error && (
        <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>
      )}

      {data && (
        <>
          <div className="row g-3 mb-3">
            <StatCard label="Doanh thu" icon="bi-cash-stack" value={formatMoney(sum.total)}
                      sub={<Compare total={sum.total} previous={sum.previousTotal} label={cfg.prev} finished={!isCurrent} />} />
            <StatCard label="Số hóa đơn" icon="bi-receipt" value={sum.billCount.toLocaleString('vi-VN')}
                      sub="Hóa đơn đã thu tiền" />
            <StatCard label="Trung bình / hóa đơn" icon="bi-calculator" value={formatMoney(sum.averagePerBill)}
                      sub="Doanh thu ÷ số hóa đơn" />
            <StatCard label="Tiền mặt / Chuyển khoản" icon="bi-wallet2"
                      value={sum.total ? `${Math.round((sum.cash * 100) / sum.total)}% / ${100 - Math.round((sum.cash * 100) / sum.total)}%` : '—'}
                      sub={`${formatMoney(sum.cash)} · ${formatMoney(sum.transfer)}`} />
          </div>

          <div className="cf-card p-3 mb-3">
            <h5 className="cf-section-title mb-3">Doanh thu theo {cfg.rowHead.toLowerCase()}</h5>
            {sum.billCount === 0
              ? <div className="empty-state"><i className="bi bi-bar-chart" />Chưa có hóa đơn nào trong kỳ này.</div>
              : <RevenueChart period={period} rows={data.rows} />}
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-7">
              <div className="cf-card h-100">
                <h5 className="cf-section-title p-3 mb-0">Bảng thống kê</h5>
                <StatsTable rowHead={cfg.rowHead} rows={data.rows} summary={sum} />
              </div>
            </div>
            <div className="col-12 col-xl-5">
              <div className="cf-card h-100">
                <h5 className="cf-section-title p-3 mb-0">Món bán chạy</h5>
                <TopItems items={data.topItems} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function StatCard({ label, icon, value, sub }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="cf-card stat-card h-100">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div className="cf-muted small mb-2">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="small text-muted mt-1">{sub}</div>
          </div>
          <span className="stat-icon"><i className={`bi ${icon}`} /></span>
        </div>
      </div>
    </div>
  )
}

/** So với kỳ trước. Kỳ chưa kết thúc thì chỉ ghi số của kỳ trước (so % lúc này dễ hiểu nhầm là đang giảm). */
function Compare({ total, previous, label, finished }) {
  if (!finished || previous === 0) return <>{label}: {formatMoney(previous)}</>
  const pct = Math.round(((total - previous) * 100) / previous)
  const up = pct >= 0
  return (
    <span className={up ? 'text-success' : 'text-danger'}>
      <i className={`bi ${up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'} me-1`} aria-hidden="true" />
      {up ? 'Tăng' : 'Giảm'} {Math.abs(pct)}% so với {label.toLowerCase()}
    </span>
  )
}

/** Biểu đồ cột 1 dãy số liệu, rê chuột vào cột để xem chi tiết. */
function RevenueChart({ period, rows }) {
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(...rows.map((r) => r.total)))
  const peak = rows.reduce((a, b) => (b.total > a.total ? b : a))
  const every = rows.length > 12 ? 5 : 1 // tháng 28-31 cột: chỉ ghi ngày 1, 5, 10, 15...
  const showTick = (i) => every === 1 || i === 0 || (i + 1) % every === 0

  return (
    <div className="rv-chart" onMouseLeave={() => setHover(null)}>
      <div className="rv-axis" aria-hidden="true">
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="rv-gridline" style={{ bottom: `${f * 100}%` }}>
            <span>{compactMoney(max * f)}</span>
          </div>
        ))}
      </div>
      <div className="rv-bars" role="img" aria-label="Biểu đồ doanh thu, xem số liệu chi tiết ở bảng thống kê bên dưới">
        {rows.map((r, i) => (
          <div key={r.label} className={`rv-col ${hover === i ? 'is-hover' : ''}`} onMouseEnter={() => setHover(i)}>
            <div className="rv-plot">
              {r === peak && <span className="rv-peak" style={{ bottom: `${(r.total / max) * 100}%` }}>{compactMoney(r.total)}</span>}
              <div className="rv-bar" style={{ height: `${(r.total / max) * 100}%` }} />
              {hover === i && (
                <div className={`rv-tip ${i > rows.length / 2 ? 'is-left' : ''}`}>
                  <div className="fw-semibold">{r.label}</div>
                  <div>{formatMoney(r.total)}</div>
                  <div className="cell-sub">{r.billCount} hóa đơn</div>
                </div>
              )}
            </div>
            <div className="rv-tick">{showTick(i) ? shortLabel(period, r.label) : ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsTable({ rowHead, rows, summary }) {
  if (rows.length === 0) return <div className="empty-state"><i className="bi bi-table" />Chưa có số liệu.</div>
  return (
    <div className="table-responsive">
      <table className="table cf-table mb-0 align-middle">
        <thead>
          <tr>
            <th>{rowHead}</th>
            <th className="text-end">Số HĐ</th>
            <th className="text-end">Tiền mặt</th>
            <th className="text-end">Chuyển khoản</th>
            <th className="text-end">Doanh thu</th>
            <th className="text-end">Tỉ trọng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={r.billCount === 0 ? 'text-muted' : ''}>
              <td className="text-nowrap">{r.label}</td>
              <td className="text-end">{r.billCount}</td>
              <td className="text-end text-nowrap">{formatMoney(r.cash)}</td>
              <td className="text-end text-nowrap">{formatMoney(r.transfer)}</td>
              <td className="text-end text-nowrap fw-semibold">{formatMoney(r.total)}</td>
              <td className="text-end">{summary.total ? `${((r.total * 100) / summary.total).toFixed(1)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="fw-bold">
            <td>Tổng</td>
            <td className="text-end">{summary.billCount}</td>
            <td className="text-end text-nowrap">{formatMoney(summary.cash)}</td>
            <td className="text-end text-nowrap">{formatMoney(summary.transfer)}</td>
            <td className="text-end text-nowrap">{formatMoney(summary.total)}</td>
            <td className="text-end">{summary.total ? '100%' : '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function TopItems({ items }) {
  if (items.length === 0) return <div className="empty-state"><i className="bi bi-cup-hot" />Chưa bán được món nào.</div>
  return (
    <div className="table-responsive">
      <table className="table cf-table mb-0 align-middle">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Món</th>
            <th className="text-end">SL</th>
            <th className="text-end">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.name}>
              <td className="cf-muted">{i + 1}</td>
              <td className="fw-medium">{it.name}</td>
              <td className="text-end">{it.quantity}</td>
              <td className="text-end text-nowrap">{formatMoney(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cell-sub px-3 py-2 mb-0">Thành tiền theo giá món, chưa trừ giảm giá bằng điểm.</p>
    </div>
  )
}
