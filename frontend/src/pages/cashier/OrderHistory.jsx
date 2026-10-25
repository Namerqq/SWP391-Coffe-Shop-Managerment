import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import usePolling from '../../utils/usePolling'
import { formatDateTime } from '../../utils/format'
import { formatMoney, formatTime, itemOptionsText, ORDER_STATUS, placeLabel } from '../../utils/orderFormat'
import '../../styles/cashier.css'

// Today's order and bill history — SRS 1.3.6, UC-C15 View Bills History (ThangNN Iter3).
// 1 danh sách đơn trong ngày (mặc định hôm nay, chọn được ngày bất kỳ trước đó); đơn đã trả có nút "Xem hóa đơn".
// Mỗi đơn có 2 trạng thái song song (phục vụ / thanh toán) nên lọc bằng 2 ô riêng. Chỉ xem, không sửa / hủy.

const METHOD = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' }

const TYPES = [
  { value: '', label: 'Mọi loại đơn' },
  { value: 'DINE_IN', label: 'Tại bàn' },
  { value: 'PICKUP', label: 'Mang đi' },
  { value: 'DELIVERY', label: 'Giao hàng (online)' },
]

const isDelivery = (o) => o.fulfillmentType === 'DELIVERY'
const isCancelled = (o) => o.status === 'CANCELLED' || o.status === 'REJECTED'
// Đơn online đang chờ thu ngân duyệt (đơn tại bàn ở trạng thái này vẫn là "Chờ pha" như các màn khác).
const isAwaitingConfirm = (o) => isDelivery(o) && o.status === 'PENDING_CONFIRMATION'

const SERVE = [
  { value: '', label: 'Mọi trạng thái phục vụ' },
  { value: 'AWAITING', label: 'Chờ xác nhận (online)', match: isAwaitingConfirm },
  { value: 'WAITING', label: 'Chờ pha', match: (o) => !isAwaitingConfirm(o) && (o.status === 'PENDING_CONFIRMATION' || o.status === 'CONFIRMED') },
  { value: 'PREPARING', label: 'Đang pha', match: (o) => o.status === 'PREPARING' },
  { value: 'READY', label: 'Chờ mang ra / chờ giao', match: (o) => o.status === 'READY' },
  { value: 'DONE', label: 'Đã phục vụ / đã giao', match: (o) => o.status === 'COMPLETED' },
  { value: 'CANCELLED', label: 'Đã hủy', match: isCancelled },
]

const PAY = [
  { value: '', label: 'Mọi thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'UNPAID', label: 'Chưa thanh toán' },
]

/** Nhãn phục vụ: giống các màn khác, riêng đơn online thì "Chờ xác nhận" / "Đã giao". */
function serveStatus(o) {
  if (isAwaitingConfirm(o)) return { label: 'Chờ xác nhận', tone: 'pending' }
  if (isDelivery(o) && o.status === 'COMPLETED') return { label: 'Đã giao', tone: 'served' }
  const s = ORDER_STATUS[o.status]
  return s || { label: o.status, tone: 'served' }
}

/** Ngày hôm nay theo giờ máy, dạng yyyy-mm-dd (giá trị của ô chọn ngày). */
function todayString() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const dayLabel = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function OrderHistory() {
  const [params, setParams] = useSearchParams()
  const today = todayString()
  const date = params.get('date') || today
  const isToday = date === today

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('')
  const [serve, setServe] = useState('')
  const [pay, setPay] = useState('')
  const [keyword, setKeyword] = useState('')
  const requestNo = useRef(0)

  const load = useCallback(async () => {
    const no = ++requestNo.current
    try {
      const res = await cashierApi.getHistory(date)
      if (no !== requestNo.current) return // đã đổi sang ngày khác
      setData(res.data)
      setError('')
    } catch (e) {
      if (no !== requestNo.current) return
      setData(null)
      setError(errorMessage(e, 'Không tải được lịch sử đơn.'))
    } finally {
      if (no === requestNo.current) setLoading(false)
    }
  }, [date])

  // Đổi ngày -> tải ngay; sau đó tự tải lại mỗi 30 giây.
  useEffect(() => {
    setLoading(true)
    setData(null)
    load()
  }, [load])
  usePolling(load, 30000)

  const changeDate = (value) => {
    if (!value) return
    setParams(value === today ? {} : { date: value }, { replace: true })
  }

  const kw = keyword.trim().toLowerCase()
  const serveMatch = SERVE.find((s) => s.value === serve)?.match
  const rows = (data?.orders || []).filter(({ order: o, paymentCode }) => {
    if (type && o.fulfillmentType !== type) return false
    if (serveMatch && !serveMatch(o)) return false
    if (pay && o.paymentStatus !== pay) return false
    if (!kw) return true
    return [o.orderNumber, o.displayNumber, paymentCode, o.tableNumber, o.customerPhone, o.customerName]
      .some((v) => v && String(v).toLowerCase().includes(kw))
  })
  const hasFilter = type || serve || pay || kw
  const total = data?.orders.length || 0
  const sum = data?.summary

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Lịch sử đơn</h1>
          <p className="page-subtitle">
            Mọi đơn {isToday ? 'hôm nay' : `ngày ${dayLabel(date)}`}: tại bàn, mang đi và giao hàng online.
            Đơn đã thanh toán bấm "Xem hóa đơn" để xem hoặc in lại.
          </p>
        </div>
        <button type="button" className="btn btn-light-soft" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />Tải lại
        </button>
      </div>

      <div className="cf-card">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom" style={{ borderColor: 'var(--cf-border)' }}>
          <input type="date" className="form-control" style={{ width: 'auto' }} value={date} max={today}
                 onChange={(e) => changeDate(e.target.value)} aria-label="Chọn ngày" />
          {!isToday && (
            <button type="button" className="btn btn-light-soft" onClick={() => changeDate(today)}>Hôm nay</button>
          )}
          <div className="input-icon flex-grow-1" style={{ minWidth: 220 }}>
            <i className="bi bi-search" />
            <input className="form-control" placeholder="Tìm mã đơn, mã hóa đơn, số bàn, SĐT..." value={keyword}
                   onChange={(e) => setKeyword(e.target.value)} aria-label="Tìm đơn" />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={type}
                  onChange={(e) => setType(e.target.value)} aria-label="Lọc theo loại đơn">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={serve}
                  onChange={(e) => setServe(e.target.value)} aria-label="Lọc theo trạng thái phục vụ">
            {SERVE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={pay}
                  onChange={(e) => setPay(e.target.value)} aria-label="Lọc theo thanh toán">
            {PAY.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {hasFilter && (
            <button type="button" className="btn btn-link text-decoration-none"
                    onClick={() => { setType(''); setServe(''); setPay(''); setKeyword('') }}>
              Xóa lọc
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger m-3">{error}</div>}
        {loading && !data && !error && (
          <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>
        )}

        {data && rows.length === 0 && (
          <div className="empty-state">
            <i className="bi bi-receipt" />
            {total === 0
              ? `Không có đơn nào ${isToday ? 'hôm nay' : `ngày ${dayLabel(date)}`}.`
              : 'Không có đơn nào khớp bộ lọc.'}
          </div>
        )}

        {rows.length > 0 && (
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Đơn</th>
                  <th>Loại</th>
                  <th>Món</th>
                  <th className="text-end">Tổng tiền</th>
                  <th>Phục vụ</th>
                  <th>Thanh toán</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order: o, paymentCode, paymentMethod, cashierName }) => {
                  const st = serveStatus(o)
                  const paid = o.paymentStatus === 'PAID'
                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="fw-semibold">{o.displayNumber}</div>
                        <div className="cell-sub">{o.orderNumber} · {formatTime(o.createdAt)}</div>
                      </td>
                      <td>
                        <div>{placeLabel(o)}</div>
                        {(o.customerName || o.customerPhone) && (
                          <div className="cell-sub">{[o.customerName, o.customerPhone].filter(Boolean).join(' · ')}</div>
                        )}
                      </td>
                      <td style={{ minWidth: 200 }}>
                        {o.items.map((i) => (
                          <div key={i.id} className={`small ${i.status === 'CANCELLED' ? 'text-decoration-line-through text-muted' : ''}`}>
                            {i.quantity}× {i.itemName}
                            {itemOptionsText(i) && <span className="cell-sub"> ({itemOptionsText(i)})</span>}
                          </div>
                        ))}
                        {o.cancelReason && <div className="cell-sub text-danger">Lý do hủy: {o.cancelReason}</div>}
                      </td>
                      <td className="text-end fw-semibold text-nowrap">{formatMoney(o.totalAmount)}</td>
                      <td><span className={`status-pill tone-${st.tone}`}>{st.label}</span></td>
                      <td>
                        <span className={`pay-pill ${paid ? 'is-paid' : 'is-unpaid'}`}>
                          <i className={`bi ${paid ? 'bi-check2-circle' : 'bi-wallet2'}`} aria-hidden="true" />
                          {paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                        {paid && (
                          <div className="cell-sub mt-1">
                            {paymentCode && <>{paymentCode} · </>}
                            {METHOD[paymentMethod] || paymentMethod}
                            {' · '}{cashierName || 'Tự động (QR online)'}
                            {o.paidAt && <> · {formatTime(o.paidAt)}</>}
                          </div>
                        )}
                      </td>
                      <td className="text-end">
                        {o.paymentId && (
                          <Link to={`/cashier/receipt/${o.paymentId}`} className="btn btn-sm btn-light-soft text-nowrap"
                                state={{ from: 'history', back: isToday ? '/cashier/history' : `/cashier/history?date=${date}` }}>
                            <i className="bi bi-receipt me-1" aria-hidden="true" />Xem hóa đơn
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 border-top" style={{ borderColor: 'var(--cf-border)' }}>
            <div className="cell-sub">
              {hasFilter ? `Đang hiện ${rows.length}/${total} đơn` : `${total} đơn`} {isToday ? 'hôm nay' : `ngày ${dayLabel(date)}`}
              {isToday && ' · tự tải lại mỗi 30 giây'}
            </div>
            <div className="text-end">
              <div>
                Đã thu {isToday ? 'hôm nay' : `ngày ${dayLabel(date)}`}: <strong className="fs-5">{formatMoney(sum.total)}</strong>
                <span className="cell-sub"> từ {sum.billCount} hóa đơn</span>
              </div>
              <div className="cell-sub">
                Tiền mặt {formatMoney(sum.cash)} · Chuyển khoản {formatMoney(sum.transfer)} (tính theo giờ thu tiền, đã trừ giảm giá)
              </div>
            </div>
          </div>
        )}
      </div>
      {data && <p className="cell-sub mt-2 mb-0">Cập nhật lúc {formatDateTime(new Date())}</p>}
    </>
  )
}
