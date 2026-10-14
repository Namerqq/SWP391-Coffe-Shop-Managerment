import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import staffApi from '../../api/staffApi'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { useToast } from '../../context/ToastContext'
import usePolling from '../../utils/usePolling'
import StatusPill from '../../components/order/StatusPill'
import ConfirmModal from '../../components/ConfirmModal'
import { formatMoney, formatTime, itemOptionsText } from '../../utils/orderFormat'
import PaymentModal from './PaymentModal'
import PaymentPill, { isPaid } from './PaymentPill'
import QrPaymentDialog from './QrPaymentDialog'
import { markQrAnnounced } from './qrScreen'
import '../../styles/cashier.css'

/**
 * Bill Detail & Edit Bill — SRS 1.3.1 / 1.3.2. UC-C05, UC-C06.
 * Mỗi đơn có 2 trạng thái song song: phục vụ (Chờ pha / Đang pha / Chờ mang ra / Đã phục vụ)
 * và thanh toán (Chưa / Đã thanh toán). Thu ngân tick chọn đơn chưa thanh toán để thu, đơn ở trạng thái
 * phục vụ nào cũng được (mặc định chọn hết). Bàn tự trả về trống khi mọi đơn đã phục vụ và đã thanh toán.
 * Đơn đang nằm trong mã QR payOS chờ khách quét: không tick được, hiện "Đang chờ QR"; khung bên phải
 * cho xem lại mã hoặc hủy mã (khách trả xong hệ thống tự xác nhận).
 * Món trong hóa đơn chỉ xem (theo Permission Matrix, Thu ngân không sửa / hủy đơn).
 */
export default function BillDetail() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [pendingQrs, setPendingQrs] = useState([]) // mã QR đang chờ của bàn này
  const [vacantMsg, setVacantMsg] = useState('')
  const [error, setError] = useState('')
  const [skipped, setSkipped] = useState(() => new Set()) // id đơn thu ngân bỏ chọn; đơn mới gọi thêm tự được chọn
  const [payTarget, setPayTarget] = useState(null) // chốt danh sách đơn + số tiền lúc mở hộp thanh toán
  const [viewQr, setViewQr] = useState(null) // mã QR đang mở lại để khách quét
  const [cancelQr, setCancelQr] = useState(null) // mã QR đang hỏi xác nhận hủy
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await staffApi.getTableSession(tableId)
      setSession(res.data)
      setVacantMsg('')
      setError('')
      try {
        setPendingQrs((await cashierApi.getPendingQrs({ sessionId: res.data.sessionId })).data)
      } catch {
        setPendingQrs([])
      }
    } catch (e) {
      if (e.response?.status === 404) {
        setSession(null)
        setPendingQrs([])
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
  const qrOrderIds = new Set(pendingQrs.flatMap((q) => q.orderIds))
  const unpaid = orders.filter((o) => !isPaid(o))
  const payable = unpaid.filter((o) => !qrOrderIds.has(o.id)) // đơn trong mã QR đang chờ thì không thu cách khác
  const selected = payable.filter((o) => !skipped.has(o.id))
  const selectedTotal = selected.reduce((sum, o) => sum + o.totalAmount, 0)
  const selectedNotServed = selected.filter((o) => o.status !== 'COMPLETED')
  const allSelected = payable.length > 0 && selected.length === payable.length
  const numbers = (list) => list.map((o) => o.displayNumber).join(', ')

  const toggle = (id) => setSkipped((cur) => {
    const next = new Set(cur)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const toggleAll = () => setSkipped(allSelected ? new Set(payable.map((o) => o.id)) : new Set())

  const openPay = () => setPayTarget({
    orderIds: selected.map((o) => o.id),
    label: `Thu cho ${selected.length} đơn: ${numbers(selected)}`,
    subtotal: selectedTotal,
  })

  const paid = (result) => {
    setPayTarget(null)
    setViewQr(null)
    setSkipped(new Set())
    toast(result.tableReleased
      ? `Đã thu ${formatMoney(result.amount)}. ${session.tableNumber} đã xong, bàn trả về trống.`
      : `Đã thu ${formatMoney(result.amount)} cho ${session.tableNumber}.`)
    navigate(`/cashier/receipt/${result.paymentId}`, { replace: true })
  }

  const confirmCancelQr = async () => {
    setCancelling(true)
    try {
      const v = (await cashierApi.cancelQr(cancelQr.id)).data
      if (v.status === 'PAID') {
        markQrAnnounced(v.id)
        toast(`Khách vừa thanh toán xong ${formatMoney(v.amount)}, mã không cần hủy nữa.`)
      } else {
        toast('Đã hủy mã QR. Các đơn trong mã có thể thu bằng cách khác.')
      }
      setCancelQr(null)
      load()
    } catch (e) {
      toast(errorMessage(e, 'Không hủy được mã QR.'), 'error')
    } finally {
      setCancelling(false)
    }
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
            <div className="d-flex justify-content-between align-items-center gap-2 px-3 py-2 border-bottom">
              <span className="fw-semibold">Các đơn của bàn</span>
              {payable.length > 1 && (
                <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={toggleAll}>
                  {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả đơn chưa thanh toán'}
                </button>
              )}
            </div>
            <div className="px-3">
              {orders.map((o) => {
                const paidOrder = isPaid(o)
                const inQr = !paidOrder && qrOrderIds.has(o.id)
                const boxId = `pay-order-${o.id}`
                return (
                  <div key={o.id} className={`bill-order${paidOrder ? ' is-paid' : ''}`}>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-3 pb-1">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="bill-check">
                          {paidOrder && <i className="bi bi-check2-circle" aria-hidden="true" />}
                          {inQr && <i className="bi bi-qr-code bill-check-qr" aria-hidden="true" />}
                          {!paidOrder && !inQr && (
                            <input type="checkbox" className="form-check-input" id={boxId} checked={!skipped.has(o.id)}
                                   aria-label={`Thu tiền đơn ${o.displayNumber}`} onChange={() => toggle(o.id)} />
                          )}
                        </span>
                        {paidOrder || inQr
                          ? <span className="fw-bold">{o.displayNumber}</span>
                          : <label htmlFor={boxId} className="bill-order-no">{o.displayNumber}</label>}
                        <StatusPill status={o.status} />
                        {inQr
                          ? <span className="pay-pill is-qr"><i className="bi bi-qr-code" aria-hidden="true" />Đang chờ QR</span>
                          : <PaymentPill order={o} />}
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
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-3 small">
                      {paidOrder ? (
                        <span className="cell-sub">
                          Đã thu lúc {formatTime(o.paidAt)}
                          {o.paymentId && <>, <Link to={`/cashier/receipt/${o.paymentId}`}>xem hóa đơn</Link></>}
                        </span>
                      ) : inQr ? (
                        <span className="cell-sub">Đang chờ khách quét mã QR, chưa sửa / hủy được</span>
                      ) : (
                        <span className="cell-sub">
                          {o.status === 'COMPLETED' ? 'Đã phục vụ, chờ thu tiền' : 'Chưa phục vụ xong, vẫn thu trước được'}
                        </span>
                      )}
                      <span className="fw-semibold">{formatMoney(o.totalAmount)}</span>
                    </div>
                  </div>
                )
              })}
              {cancelledCount > 0 && <div className="cell-sub py-2">{cancelledCount} đơn đã hủy, không tính tiền.</div>}
            </div>
            <div className="bill-sum px-3 py-3 border-top">
              <div className="d-flex justify-content-between"><span className="cf-muted">Tổng các đơn</span><span>{formatMoney(session.total)}</span></div>
              <div className="d-flex justify-content-between"><span className="cf-muted">Đã thanh toán</span><span>{formatMoney(session.paidTotal)}</span></div>
              <div className="d-flex justify-content-between bill-total"><span>Chưa thanh toán</span><span>{formatMoney(session.unpaidTotal)}</span></div>
            </div>
          </div>
        </div>

        <div className="col-lg-5 d-grid gap-3 align-content-start">
          {pendingQrs.map((q) => (
            <div className="cf-card p-4 qr-wait-card" key={q.id}>
              <div className="fw-semibold mb-1"><i className="bi bi-qr-code-scan me-1" aria-hidden="true" />Đang chờ khách quét mã QR</div>
              <p className="cf-muted small mb-3">
                Đơn {q.orderNumbers}, mã hết hạn lúc {formatTime(q.expiresAt)}. Khách trả xong hệ thống tự xác nhận.
              </p>
              <div className="d-flex justify-content-between align-items-baseline mb-3">
                <span>Số tiền trong mã</span>
                <span className="bill-due">{formatMoney(q.amount)}</span>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-primary flex-grow-1" onClick={() => setViewQr(q)}>Xem mã QR</button>
                <button type="button" className="btn btn-light-soft" onClick={() => setCancelQr(q)}>Hủy mã</button>
              </div>
            </div>
          ))}

          {payable.length > 0 && (
            <div className="cf-card p-4">
              <div className="fw-semibold mb-1">Thu tiền</div>
              <p className="cf-muted small mb-3">
                {selected.length === 0
                  ? 'Tick chọn ít nhất 1 đơn ở danh sách bên trái để thu tiền.'
                  : `Đã chọn ${selected.length}/${payable.length} đơn chưa thanh toán: ${numbers(selected)}.`}
              </p>
              <div className="d-flex justify-content-between align-items-baseline mb-3">
                <span>Cần thu</span>
                <span className="bill-due">{formatMoney(selectedTotal)}</span>
              </div>
              {selectedNotServed.length > 0 && (
                <div className="bill-hint mb-3">
                  <i className="bi bi-info-circle me-1" aria-hidden="true" />
                  {numbers(selectedNotServed)} chưa phục vụ xong, vẫn thu trước được.
                  Bàn tự trả về trống khi mọi đơn đã phục vụ và đã thanh toán.
                </div>
              )}
              {session.customer && (
                <p className="small mb-3"><i className="bi bi-person-check me-1" />Khách: {session.customer.fullName || session.customer.phoneNumber}</p>
              )}
              <button type="button" className="btn btn-primary w-100 py-2" disabled={selected.length === 0} onClick={openPay}>
                Thanh toán {formatMoney(selectedTotal)}
              </button>
            </div>
          )}

          {unpaid.length === 0 && (
            <div className="cf-card p-4">
              <div className="fw-semibold mb-1 bill-ok"><i className="bi bi-check2-circle me-1" aria-hidden="true" />Đã thanh toán đủ</div>
              <p className="cf-muted small mb-0">
                {session.unfinishedOrders.length > 0
                  ? `Còn ${session.unfinishedOrders.length} đơn chưa phục vụ xong (${session.unfinishedOrders.join(', ')}). Bàn tự trả về trống khi phục vụ xong.`
                  : 'Mọi đơn đã phục vụ và đã thanh toán, bàn sẽ tự trả về trống.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <PaymentModal show={!!payTarget} title={`Thanh toán ${session.tableNumber}`} subtotal={payTarget?.subtotal ?? 0}
                    description={payTarget?.label} initialCustomer={session.customer}
                    transferNote={`${session.sessionCode} ${session.tableNumber}`}
                    onClose={() => { setPayTarget(null); load() }}
                    onSubmit={(payload) => cashierApi.paySession(session.sessionId,
                      { ...payload, orderIds: payTarget.orderIds, expectedSubtotal: payTarget.subtotal })}
                    onCreateQr={(payload) => cashierApi.createSessionQr(session.sessionId,
                      { ...payload, orderIds: payTarget.orderIds, expectedSubtotal: payTarget.subtotal })}
                    onPaid={paid} />
      <QrPaymentDialog qr={viewQr} title={`Mã QR ${session.tableNumber}`} onPaid={paid}
                       onClose={() => { setViewQr(null); load() }} />
      <ConfirmModal show={!!cancelQr} title="Hủy mã QR?" danger confirmText="Hủy mã" loading={cancelling}
                    message={`Chỉ hủy khi khách chưa chuyển tiền. Hủy xong, đơn ${cancelQr?.orderNumbers || ''} có thể thu bằng cách khác.`}
                    onConfirm={confirmCancelQr} onClose={() => setCancelQr(null)} />
    </>
  )
}
