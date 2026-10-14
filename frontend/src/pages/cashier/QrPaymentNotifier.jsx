import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import cashierApi from '../../api/cashierApi'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import { formatMoney } from '../../utils/orderFormat'
import { markQrAnnounced, qrPlace, shortNo, shouldAnnounce } from './qrScreen'

/**
 * Thông báo chung trên mọi màn Thu ngân (gắn ở thangnnRoutes): mã QR nào vừa được khách thanh toán
 * (hệ thống tự xác nhận) thì hiện thông báo, kể cả khi thu ngân đã đóng hộp QR hoặc đang ở màn khác.
 * Tiền về mà không ghi được vào hóa đơn (MISMATCH) thì hiện khung cảnh báo, giữ đến khi bấm Đã hiểu.
 * Hỏi backend mỗi 3 giây (GET /cashier/qr-payments/events?since=...).
 */
export default function QrPaymentNotifier() {
  const toast = useToast()
  const since = useRef(null)
  const startedAt = useRef(null)
  const seen = useRef(new Set())
  const [alerts, setAlerts] = useState([])

  const poll = useCallback(async () => {
    let data
    try {
      data = (await cashierApi.getQrEvents(since.current)).data
    } catch {
      return
    }
    if (!startedAt.current) startedAt.current = new Date(data.serverTime)
    since.current = data.serverTime
    data.events.forEach((e) => {
      const key = `${e.id}:${e.status}`
      if (seen.current.has(key)) return
      seen.current.add(key)
      if (e.statusChangedAt && new Date(e.statusChangedAt) < startedAt.current) return // việc cũ trước khi mở trang
      if (e.status === 'MISMATCH') {
        setAlerts((cur) => (cur.some((x) => x.id === e.id) ? cur : [...cur, e]))
        return
      }
      if (!shouldAnnounce(e.id)) return
      markQrAnnounced(e.id)
      toast(e.target === 'TAKEAWAY'
        ? `Đơn mang đi ${shortNo(e.takeawayOrderNumber)}: khách đã thanh toán QR ${formatMoney(e.amount)}, đã gửi pha chế.`
        : `${e.tableNumber}: khách đã thanh toán QR ${formatMoney(e.amount)}.${e.tableReleased ? ' Bàn đã trả về trống.' : ''}`)
    })
  }, [toast])
  usePolling(poll, 3000)

  if (alerts.length === 0) return null
  return (
    <div className="qr-alerts" role="alert" aria-live="assertive">
      {alerts.map((e) => (
        <div className="qr-alert" key={e.id}>
          <div className="fw-semibold">
            <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />
            {qrPlace(e)}: tiền QR {formatMoney(e.amount)} cần kiểm tra tay
          </div>
          <div className="small mt-1">{e.note}</div>
          <div className="small mt-1">Mở app ngân hàng kiểm tra, rồi thu bằng Chuyển khoản thủ công hoặc hoàn tiền cho khách.</div>
          <div className="d-flex gap-2 mt-2">
            {e.target === 'TABLE' && e.tableId && (
              <Link className="btn btn-light-soft btn-sm" to={`/cashier/bill/${e.tableId}`}>Mở hóa đơn bàn</Link>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setAlerts((cur) => cur.filter((x) => x.id !== e.id))}>
              Đã hiểu
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
