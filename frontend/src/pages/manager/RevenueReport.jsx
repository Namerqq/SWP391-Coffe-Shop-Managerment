import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import revenueApi from '../../api/revenueApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney } from '../../utils/orderFormat'
import '../../styles/revenue.css'

// UC-RP01 View Order Statistics & GBR-12 Sales Report — Quản lý xem doanh thu của quán.
// Hỗ trợ: ngày, tuần, tháng, năm và khoảng ngày tùy chọn (Custom Date Range) + Quick ranges.
// Bổ sung: Xuất CSV/Excel, In báo cáo chuẩn nghiệp vụ, phân tích tỷ trọng món bán chạy và tỷ lệ tiền mặt/CK.

const PERIODS = [
  { value: 'DAY', label: 'Ngày', prev: 'Hôm qua', rowHead: 'Giờ' },
  { value: 'WEEK', label: 'Tuần', prev: 'Tuần trước', rowHead: 'Ngày' },
  { value: 'MONTH', label: 'Tháng', prev: 'Tháng trước', rowHead: 'Ngày' },
  { value: 'YEAR', label: 'Năm', prev: 'Năm trước', rowHead: 'Tháng' },
  { value: 'CUSTOM', label: 'Tùy chọn ngày', prev: 'Kỳ trước', rowHead: 'Ngày' },
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
  if (!data) return '…'
  if (data.period === 'DAY') return `Ngày ${dmy(data.from)}`
  if (data.period === 'WEEK') return `Tuần ${dm(data.from)} – ${dmy(data.to)}`
  if (data.period === 'MONTH') return `Tháng ${data.from.slice(5, 7)}/${data.from.slice(0, 4)}`
  if (data.period === 'YEAR') return `Năm ${data.from.slice(0, 4)}`
  return `Từ ${dmy(data.from)} đến ${dmy(data.to)}`
}

/** Nhãn ngắn dưới cột biểu đồ: "08h", "T2", "15", "T10". */
function shortLabel(period, label) {
  if (period === 'DAY') return label.slice(0, 2) + 'h'
  if (period === 'WEEK') return label.split(' ')[0]
  if (period === 'MONTH') return String(Number(label.slice(0, 2)))
  if (period === 'YEAR') return 'T' + label.replace('Tháng ', '')
  return label
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

/** Xuất báo cáo ra định dạng CSV (hỗ trợ mở trực tiếp trên Excel không bị lỗi font tiếng Việt) */
function exportRevenueCSV(data, title) {
  if (!data) return
  const lines = []
  lines.push('BÁO CÁO DOANH THU & BÁN HÀNG')
  lines.push(`Kỳ báo cáo: ${title}`)
  lines.push(`Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}`)
  lines.push('')

  lines.push('TỔNG HỢP KINH DOANH')
  lines.push(`Tổng doanh thu,${data.summary.total}`)
  lines.push(`Tổng số hóa đơn,${data.summary.billCount}`)
  lines.push(`Doanh thu tiền mặt,${data.summary.cash}`)
  lines.push(`Doanh thu chuyển khoản,${data.summary.transfer}`)
  lines.push(`Giá trị trung bình/hóa đơn,${data.summary.averagePerBill}`)
  lines.push(`Doanh thu kỳ trước,${data.summary.previousTotal}`)
  lines.push('')

  lines.push('CHI TIẾT THEO MỐC THỜI GIAN')
  lines.push('Mốc thời gian,Số hóa đơn,Tiền mặt (VNĐ),Chuyển khoản (VNĐ),Tổng doanh thu (VNĐ),Tỉ trọng (%)')
  for (const r of data.rows) {
    const share = data.summary.total ? ((r.total * 100) / data.summary.total).toFixed(1) : '0'
    lines.push(`"${r.label}",${r.billCount},${r.cash},${r.transfer},${r.total},${share}%`)
  }
  lines.push('')

  lines.push('TOP MÓN BÁN CHẠY')
  lines.push('Xếp hạng,Tên món,Số lượng bán,Thành tiền (VNĐ),Tỉ trọng doanh thu (%)')
  data.topItems.forEach((it, idx) => {
    const itemShare = data.summary.total ? ((it.amount * 100) / data.summary.total).toFixed(1) : '0'
    lines.push(`${idx + 1},"${it.name}",${it.quantity},${it.amount},${itemShare}%`)
  })

  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `BaoCaoDoanhThu_${data.from}_${data.to}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function RevenueReport() {
  const [params, setParams] = useSearchParams()
  const today = isoDate(new Date())
  const period = PERIODS.some((p) => p.value === params.get('period')) ? params.get('period') : 'DAY'
  const date = params.get('date') || today
  const fromDate = params.get('fromDate') || shiftDate(today, 'DAY', -6)
  const toDate = params.get('toDate') || today

  const cfg = PERIODS.find((p) => p.value === period) || PERIODS[0]

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestNo = useRef(0)

  // Local state cho custom range date pickers
  const [customStart, setCustomStart] = useState(fromDate)
  const [customEnd, setCustomEnd] = useState(toDate)

  useEffect(() => {
    setCustomStart(fromDate)
    setCustomEnd(toDate)
  }, [fromDate, toDate])

  const load = useCallback(async () => {
    const no = ++requestNo.current
    setLoading(true)
    try {
      let res
      if (period === 'CUSTOM') {
        res = await revenueApi.getReport('CUSTOM', null, fromDate, toDate)
      } else {
        res = await revenueApi.getReport(period, date === today ? null : date)
      }
      if (no !== requestNo.current) return
      setData(res.data)
      setError('')
    } catch (e) {
      if (no !== requestNo.current) return
      setData(null)
      setError(errorMessage(e, 'Không tải được số liệu doanh thu.'))
    } finally {
      if (no === requestNo.current) setLoading(false)
    }
  }, [period, date, fromDate, toDate, today])

  useEffect(() => {
    load()
  }, [load])

  const go = (nextPeriod, nextDate) => {
    const d = nextDate > today ? today : nextDate
    const p = {}
    if (nextPeriod !== 'DAY') p.period = nextPeriod
    if (nextPeriod !== 'CUSTOM' && d !== today) p.date = d
    if (nextPeriod === 'CUSTOM') {
      p.fromDate = fromDate
      p.toDate = toDate
    }
    setParams(p, { replace: true })
  }

  const goCustom = (newFrom, newTo) => {
    const validFrom = newFrom > today ? today : newFrom
    const validTo = newTo > today ? today : newTo
    setParams({ period: 'CUSTOM', fromDate: validFrom, toDate: validTo }, { replace: true })
  }

  // Phím tắt nhanh
  const handleQuickPreset = (preset) => {
    switch (preset) {
      case 'TODAY':
        go('DAY', today)
        break
      case 'YESTERDAY':
        go('DAY', shiftDate(today, 'DAY', -1))
        break
      case 'LAST_7_DAYS':
        goCustom(shiftDate(today, 'DAY', -6), today)
        break
      case 'LAST_30_DAYS':
        goCustom(shiftDate(today, 'DAY', -29), today)
        break
      case 'THIS_MONTH':
        go('MONTH', today)
        break
      default:
        break
    }
  }

  const isCurrent = data ? data.to >= today : true
  const sum = data?.summary
  const currentTitle = periodTitle(data)

  return (
    <>
      {/* Tiêu đề ẩn chỉ hiện khi In ấn (Print Mode) */}
      <div className="rv-print-header">
        <h3 className="fw-bold mb-1">COFFEE SHOP MANAGEMENT SYSTEM</h3>
        <h4 className="fw-bold text-uppercase mb-2">BÁO CÁO DOANH THU &amp; BÁN HÀNG</h4>
        <p className="mb-1">Kỳ báo cáo: <strong>{currentTitle}</strong></p>
        <p className="small text-muted mb-3">Ngày xuất: {new Date().toLocaleString('vi-VN')}</p>
        <hr />
      </div>

      {/* Header trang (ẩn khi in) */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4 rv-no-print">
        <div>
          <h1 className="page-title">Báo cáo doanh thu &amp; Bán hàng</h1>
          <p className="page-subtitle mb-0">
            Tổng hợp tiền đã thu theo hóa đơn, cơ cấu thanh toán và danh mục món bán chạy (UC-RP01, GBR-12).
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            onClick={() => exportRevenueCSV(data, currentTitle)}
            disabled={!data || loading}
            title="Tải bảng kê chi tiết ra file CSV/Excel"
          >
            <i className="bi bi-file-earmark-excel text-success" />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            onClick={() => window.print()}
            disabled={!data || loading}
            title="In báo cáo tổng kết"
          >
            <i className="bi bi-printer text-primary" />
            <span>In báo cáo</span>
          </button>
          <button
            type="button"
            className="btn btn-light-soft d-flex align-items-center gap-1 shadow-sm"
            onClick={load}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise" />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Thanh bộ lọc kỳ và phím tắt nhanh */}
      <div className="cf-card p-3 mb-3 rv-no-print shadow-xs">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          {/* Tabs chọn chu kỳ */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="d-flex gap-1" role="tablist" aria-label="Xem theo kỳ">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="tab"
                  aria-selected={p.value === period}
                  className={`filter-btn ${p.value === period ? 'active' : ''}`}
                  onClick={() => go(p.value, date)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Phím tắt khoảng thời gian nhanh (Quick Presets) */}
            <div className="d-flex align-items-center gap-1 ms-lg-2 ps-lg-2 border-start-lg">
              <span className="small text-muted me-1 d-none d-md-inline">Nhanh:</span>
              <button
                type="button"
                className={`rv-quick-btn ${period === 'DAY' && date === today ? 'active' : ''}`}
                onClick={() => handleQuickPreset('TODAY')}
              >
                Hôm nay
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${period === 'DAY' && date === shiftDate(today, 'DAY', -1) ? 'active' : ''}`}
                onClick={() => handleQuickPreset('YESTERDAY')}
              >
                Hôm qua
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${period === 'CUSTOM' && fromDate === shiftDate(today, 'DAY', -6) && toDate === today ? 'active' : ''}`}
                onClick={() => handleQuickPreset('LAST_7_DAYS')}
              >
                7 ngày qua
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${period === 'CUSTOM' && fromDate === shiftDate(today, 'DAY', -29) && toDate === today ? 'active' : ''}`}
                onClick={() => handleQuickPreset('LAST_30_DAYS')}
              >
                30 ngày qua
              </button>
              <button
                type="button"
                className={`rv-quick-btn ${period === 'MONTH' && date === today ? 'active' : ''}`}
                onClick={() => handleQuickPreset('THIS_MONTH')}
              >
                Tháng này
              </button>
            </div>
          </div>

          {/* Điều khiển ngày chi tiết */}
          {period !== 'CUSTOM' ? (
            <div className="d-flex align-items-center gap-1 ms-auto">
              <button
                type="button"
                className="btn btn-light-soft btn-icon"
                aria-label="Kỳ trước"
                onClick={() => go(period, shiftDate(date, period, -1))}
                title="Lùi 1 kỳ"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <span className="rv-period-title">{data ? periodTitle(data) : '…'}</span>
              <button
                type="button"
                className="btn btn-light-soft btn-icon"
                aria-label="Kỳ sau"
                disabled={isCurrent}
                onClick={() => go(period, shiftDate(date, period, 1))}
                title="Tiến 1 kỳ"
              >
                <i className="bi bi-chevron-right" />
              </button>
              <input
                type="date"
                className="form-control form-control-sm ms-1 shadow-none"
                style={{ width: 'auto' }}
                value={date}
                max={today}
                onChange={(e) => e.target.value && go(period, e.target.value)}
                aria-label="Chọn ngày trong kỳ"
              />
              {!isCurrent && (
                <button
                  type="button"
                  className="btn btn-light-soft btn-sm ms-1"
                  onClick={() => go(period, today)}
                >
                  Hiện tại
                </button>
              )}
            </div>
          ) : (
            /* Điều khiển khoảng ngày tùy chọn (CUSTOM) */
            <div className="d-flex align-items-center gap-2 ms-auto flex-wrap">
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted">Từ:</span>
                <input
                  type="date"
                  className="form-control form-control-sm shadow-none"
                  style={{ width: '135px' }}
                  value={customStart}
                  max={customEnd || today}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted">Đến:</span>
                <input
                  type="date"
                  className="form-control form-control-sm shadow-none"
                  style={{ width: '135px' }}
                  value={customEnd}
                  min={customStart}
                  max={today}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm text-white px-3 shadow-xs"
                onClick={() => goCustom(customStart, customEnd)}
              >
                Áp dụng
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && !data && !error && (
        <div className="empty-state">
          <span className="spinner-border spinner-border-sm me-2" /> Đang tổng hợp số liệu báo cáo...
        </div>
      )}

      {data && (
        <>
          {/* Thẻ chỉ số tổng quan (KPI Stat Cards) */}
          <div className="row g-3 mb-3">
            <StatCard
              label="Tổng doanh thu"
              icon="bi-cash-stack"
              value={formatMoney(sum.total)}
              sub={
                <Compare
                  total={sum.total}
                  previous={sum.previousTotal}
                  label={cfg.prev}
                  finished={!isCurrent}
                />
              }
            />
            <StatCard
              label="Số hóa đơn đã thu"
              icon="bi-receipt"
              value={sum.billCount.toLocaleString('vi-VN')}
              sub={
                sum.refunded > 0
                  ? `Doanh thu đã trừ ${formatMoney(sum.refunded)} hoàn trả khách`
                  : 'Hóa đơn thanh toán thành công'
              }
            />
            <StatCard
              label="Giá trị TB / hóa đơn"
              icon="bi-calculator"
              value={formatMoney(sum.averagePerBill)}
              sub="Doanh thu ÷ số hóa đơn (AOV)"
            />
            <StatCard
              label="Tiền mặt / Chuyển khoản"
              icon="bi-wallet2"
              value={
                sum.total
                  ? `${Math.round((sum.cash * 100) / sum.total)}% / ${100 - Math.round((sum.cash * 100) / sum.total)}%`
                  : '—'
              }
              sub={`${formatMoney(sum.cash)} · ${formatMoney(sum.transfer)}`}
              extra={
                sum.total > 0 && (
                  <div className="rv-ratio-bar">
                    <div
                      className="rv-ratio-cash"
                      style={{ width: `${(sum.cash * 100) / sum.total}%` }}
                      title={`Tiền mặt: ${Math.round((sum.cash * 100) / sum.total)}%`}
                    />
                    <div
                      className="rv-ratio-transfer"
                      style={{ width: `${(sum.transfer * 100) / sum.total}%` }}
                      title={`Chuyển khoản: ${100 - Math.round((sum.cash * 100) / sum.total)}%`}
                    />
                  </div>
                )
              }
            />
          </div>

          {/* Biểu đồ phân rã doanh thu */}
          <div className="cf-card p-3 mb-3 shadow-xs">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="cf-section-title mb-0">
                <i className="bi bi-bar-chart-line text-primary me-2" />
                Doanh thu theo {cfg.rowHead.toLowerCase()}
              </h5>
              <span className="small text-muted fw-semibold">{currentTitle}</span>
            </div>
            {sum.billCount === 0 ? (
              <div className="empty-state">
                <i className="bi bi-bar-chart" />
                Chưa có hóa đơn nào phát sinh trong kỳ này.
              </div>
            ) : (
              <RevenueChart period={period} rows={data.rows} />
            )}
          </div>

          {/* Bảng phân tích chi tiết & Top món bán chạy */}
          <div className="row g-3">
            <div className="col-12 col-xl-7">
              <div className="cf-card h-100 shadow-xs">
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                  <h5 className="cf-section-title mb-0">
                    <i className="bi bi-table text-primary me-2" />
                    Bảng thống kê chi tiết
                  </h5>
                  <span className="small text-muted">{data.rows.length} mốc dữ liệu</span>
                </div>
                <StatsTable rowHead={cfg.rowHead} rows={data.rows} summary={sum} />
              </div>
            </div>

            <div className="col-12 col-xl-5">
              <div className="cf-card h-100 shadow-xs">
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                  <h5 className="cf-section-title mb-0">
                    <i className="bi bi-cup-hot text-primary me-2" />
                    Top 10 món bán chạy
                  </h5>
                  <span className="small text-muted">Đóng góp doanh thu</span>
                </div>
                <TopItems items={data.topItems} totalRevenue={sum.total} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function StatCard({ label, icon, value, sub, extra }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="cf-card stat-card h-100 shadow-xs">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div className="w-100">
            <div className="cf-muted small mb-2">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="small text-muted mt-1">{sub}</div>
            {extra}
          </div>
          <span className="stat-icon">
            <i className={`bi ${icon}`} />
          </span>
        </div>
      </div>
    </div>
  )
}

/** So sánh với kỳ trước */
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

/** Biểu đồ cột linh hoạt */
function RevenueChart({ period, rows }) {
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(...rows.map((r) => r.total)))
  const peak = rows.reduce((a, b) => (b.total > a.total ? b : a), rows[0])
  const every = rows.length > 20 ? 5 : rows.length > 10 ? 2 : 1
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
      <div className="rv-bars" role="img" aria-label="Biểu đồ doanh thu">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`rv-col ${hover === i ? 'is-hover' : ''}`}
            onMouseEnter={() => setHover(i)}
          >
            <div className="rv-plot">
              {r === peak && r.total > 0 && (
                <span className="rv-peak" style={{ bottom: `${(r.total / max) * 100}%` }}>
                  {compactMoney(r.total)}
                </span>
              )}
              <div
                className="rv-bar"
                style={{ height: max > 0 ? `${(r.total / max) * 100}%` : '0%' }}
              />
              {hover === i && (
                <div className={`rv-tip ${i > rows.length / 2 ? 'is-left' : ''}`}>
                  <div className="fw-semibold">{r.label}</div>
                  <div className="text-primary fw-bold">{formatMoney(r.total)}</div>
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
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <i className="bi bi-table" />
        Chưa có số liệu.
      </div>
    )
  }
  return (
    <div className="table-responsive">
      <table className="table cf-table mb-0 align-middle">
        <thead className="table-light">
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
              <td className="text-nowrap fw-medium">{r.label}</td>
              <td className="text-end">{r.billCount}</td>
              <td className="text-end text-nowrap">{formatMoney(r.cash)}</td>
              <td className="text-end text-nowrap">{formatMoney(r.transfer)}</td>
              <td className="text-end text-nowrap fw-bold text-dark">{formatMoney(r.total)}</td>
              <td className="text-end">
                {summary.total ? `${((r.total * 100) / summary.total).toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="table-light">
          <tr className="fw-bold">
            <td>Tổng cộng</td>
            <td className="text-end">{summary.billCount}</td>
            <td className="text-end text-nowrap">{formatMoney(summary.cash)}</td>
            <td className="text-end text-nowrap">{formatMoney(summary.transfer)}</td>
            <td className="text-end text-nowrap text-primary">{formatMoney(summary.total)}</td>
            <td className="text-end">{summary.total ? '100%' : '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function TopItems({ items, totalRevenue }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <i className="bi bi-cup-hot" />
        Chưa bán được món nào trong kỳ này.
      </div>
    )
  }
  return (
    <div className="table-responsive">
      <table className="table cf-table mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Món bán chạy</th>
            <th className="text-end">SL</th>
            <th className="text-end">Doanh thu</th>
            <th className="text-end" style={{ width: 85 }}>
              Tỉ trọng
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const share = totalRevenue > 0 ? ((it.amount * 100) / totalRevenue).toFixed(1) : 0
            return (
              <tr key={it.name}>
                <td className="cf-muted fw-semibold">{i + 1}</td>
                <td>
                  <div className="fw-medium text-dark">{it.name}</div>
                  <div className="rv-item-progress">
                    <div
                      className="rv-item-progress-bar"
                      style={{ width: `${Math.min(Number(share) * 2, 100)}%` }}
                    />
                  </div>
                </td>
                <td className="text-end fw-semibold">{it.quantity}</td>
                <td className="text-end text-nowrap fw-bold text-dark">{formatMoney(it.amount)}</td>
                <td className="text-end text-nowrap small text-muted">
                  <span className="badge bg-light text-dark border">{share}%</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="cell-sub px-3 py-2 mb-0">
        * Thành tiền tính theo giá món bán ra thực tế (chưa cấn trừ voucher giảm giá điểm).
      </p>
    </div>
  )
}
