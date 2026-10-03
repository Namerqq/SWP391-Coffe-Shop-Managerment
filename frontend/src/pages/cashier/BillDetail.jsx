import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import StatusPill from '../../components/order/StatusPill'
import { formatMoney, formatTime, itemOptionsText } from '../../utils/orderFormat'
import PaymentModal from './PaymentModal'
import '../../styles/cashier.css'

/**
 * Bill Detail & Edit Bill — SRS 1.3.1 / 1.3.2. UC-C05, UC-C06.
 * Món trong hóa đơn chỉ xem (theo Permission Matrix, Thu ngân không sửa / hủy đơn).
 * "Sửa hóa đơn" = chọn khách thân thiết, dùng điểm, chọn cách trả trong hộp Thanh toán.
 */
export default function BillDetail() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [vacantMsg, setVacantMsg] = useState('')
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await staffApi.getTableSession(tableId)
      setSession(res.data)
      setVacantMsg('')
      setError('')
    } catch (e) {
      if (e.response?.status === 404) {
        setSession(null)
        setVacantMsg(errorMessage(e))
      } else {
        setError(errorMessage(e, 'Không tải được hóa đơn của bàn.'))
      }
    }
  }, [tableId])
  usePolling(load, 5000)

  const back = (
    <Link to="/cashier" className="btn btn-light-soft"><i className="bi bi-arrow-left me-1" />Danh sách bàn</Link>
  )

  if (vacantMsg) {
    return (
      <div className="cf-card empty-state">
        <i className="bi bi-cup" />
        <p>{vacantMsg}</p>
        {back}
      </div>
    )
  }
  if (!session) {
    return error ? <div className="alert alert-danger">{error}</div>
      : <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>
  }

  const orders = session.orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED')
  const cancelledCount = session.orders.length - orders.length

  const paid = (result) => {
    setPaying(false)
    toast(`Đã thanh toán ${session.tableNumber}: ${formatMoney(result.amount)}`)
    navigate(`/cashier/receipt/${result.paymentId}`, { replace: true })
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title">Thanh toán {session.tableNumber}</h1>
          <p className="page-subtitle">{session.sessionCode}, khách vào lúc {formatTime(session.openedAt)}</p>
        </div>
        {back}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="cf-card">
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
              <span className="fw-semibold">Các món đã gọi</span>
              <span className={`status-pill ${session.payable ? 'tone-ready' : 'tone-preparing'}`}>
                {session.payable ? 'Đã phục vụ xong' : 'Đang phục vụ'}
              </span>
            </div>
            <div className="px-3 pb-2">
              {orders.map((o) => (
                <div key={o.id} className="bill-order">
                  <div className="d-flex align-items-center justify-content-between pt-3 pb-1">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold">{o.displayNumber}</span>
                      <StatusPill status={o.status} />
                    </div>
                    <span className="cell-sub">{formatTime(o.createdAt)}</span>
                  </div>
                  {o.items.filter((i) => i.status !== 'CANCELLED').map((i) => (
                    <div className="order-line" key={i.id}>
                      <span className="order-qty">{i.quantity}×</span>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div>{i.itemName}</div>
                        {itemOptionsText(i) && <div className="cell-sub">{itemOptionsText(i)}</div>}
                      </div>
                      <div className="text-nowrap">{formatMoney(i.subtotal)}</div>
                    </div>
                  ))}
                </div>
              ))}
              {cancelledCount > 0 && <div className="cell-sub py-2">{cancelledCount} đơn đã hủy, không tính tiền.</div>}
            </div>
            <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top bill-total">
              <span>Tạm tính</span>
              <span>{formatMoney(session.total)}</span>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          {session.payable ? (
            <div className="cf-card p-4">
              <div className="fw-semibold mb-1">Sẵn sàng thanh toán</div>
              <p className="cf-muted small">
                Mọi đơn đã được phục vụ. Bấm Thanh toán để nhập khách thân thiết, dùng điểm và chọn tiền mặt hoặc chuyển khoản.
              </p>
              {session.customer && (
                <p className="small mb-3"><i className="bi bi-person-check me-1" />Khách: {session.customer.fullName || session.customer.phoneNumber}</p>
              )}
              <button type="button" className="btn btn-primary w-100 py-2" onClick={() => setPaying(true)}>
                Thanh toán {formatMoney(session.total)}
              </button>
            </div>
          ) : (
            <div className="cf-card p-4">
              <div className="fw-semibold mb-1">Chưa thể thanh toán</div>
              <p className="cf-muted small mb-0">
                Còn {session.unfinishedOrders.length} đơn chưa phục vụ xong ({session.unfinishedOrders.join(', ')}).
                Đơn chưa pha có thể được nhân viên phục vụ hủy nếu khách không dùng nữa.
              </p>
            </div>
          )}
        </div>
      </div>

      <PaymentModal show={paying} title={`Thanh toán ${session.tableNumber}`} subtotal={session.total}
                    initialCustomer={session.customer} transferNote={`${session.sessionCode} ${session.tableNumber}`}
                    onClose={() => setPaying(false)}
                    onSubmit={(payload) => cashierApi.paySession(session.sessionId, payload)}
                    onPaid={paid} />
    </>
  )
}
