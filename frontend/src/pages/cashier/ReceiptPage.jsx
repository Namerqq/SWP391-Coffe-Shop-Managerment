import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime } from '../../utils/format'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { refundStatus } from './refundFormat'
import '../../styles/cashier.css'

const METHOD = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' }
// Khách trả bằng mã QR payOS (hệ thống tự xác nhận) vẫn ghi BANK_TRANSFER, hóa đơn ghi rõ hơn.
const methodLabel = (r) => (r.paymentMethod === 'BANK_TRANSFER' && r.qrAutoConfirmed
  ? 'Chuyển khoản QR' : METHOD[r.paymentMethod] || r.paymentMethod)

// Receipt Preview — SRS screen #8, UC-C09 View and Issue receipt.
// Mở từ màn Lịch sử đơn (UC-C15, state.from = 'history'): xem / in lại hóa đơn cũ, có nút quay lại lịch sử.
// Màn Khách thân thiết (UC-C12) cũng mở hóa đơn cũ như vậy, truyền thêm state.backLabel cho nút quay lại.
export default function ReceiptPage() {
  const { paymentId } = useParams()
  const location = useLocation()
  const fromHistory = location.state?.from === 'history'
  const historyBack = location.state?.back || '/cashier/history'
  const backLabel = location.state?.backLabel || 'Quay lại lịch sử đơn'
  const [r, setR] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    cashierApi.getReceipt(paymentId)
      .then((res) => setR(res.data))
      .catch((e) => setError(errorMessage(e, 'Không tải được hóa đơn.')))
  }, [paymentId])

  if (error) {
    return (
      <div className="cf-card empty-state">
        <i className="bi bi-receipt" />
        <p>{error}</p>
        {fromHistory
          ? <Link to={historyBack} className="btn btn-light-soft">{backLabel}</Link>
          : <Link to="/cashier" className="btn btn-light-soft">Về trang Thanh toán</Link>}
      </div>
    )
  }
  if (!r) return <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>

  const lines = r.orders.flatMap((o) => o.items.filter((i) => i.status !== 'CANCELLED'))
  // Đơn giao hàng online cũng không có bàn (takeaway = true) nhưng không có số thứ tự nhận đồ.
  const delivery = r.takeaway && r.orders[0]?.fulfillmentType === 'DELIVERY'
  const pickupNo = r.takeaway && !delivery && r.orders[0] ? r.orders[0].displayNumber : null

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4 no-print">
        <div>
          <h1 className="page-title">{fromHistory ? `Hóa đơn ${r.paymentCode}` : 'Thanh toán thành công'}</h1>
          <p className="page-subtitle">
            {fromHistory
              ? `${r.place}, thu lúc ${formatDateTime(r.paidAt)}, ${formatMoney(r.total)} bằng ${methodLabel(r)}${r.cashierName ? `, thu ngân ${r.cashierName}` : ''}.`
              : <>Hóa đơn {r.paymentCode}, {formatMoney(r.total)} bằng {methodLabel(r)}{r.qrAutoConfirmed && ', hệ thống tự xác nhận'}.</>}
            {!fromHistory && r.tableStillOpen && ` ${r.place} còn đơn chưa phục vụ hoặc chưa thanh toán nên bàn chưa trả về trống.`}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}><i className="bi bi-printer me-1" />In hóa đơn</button>
          {fromHistory ? (
            <Link to={historyBack} className="btn btn-light-soft"><i className="bi bi-arrow-left me-1" />{backLabel}</Link>
          ) : (
            <>
              {r.takeaway && !delivery && <Link to="/cashier/takeaway" className="btn btn-light-soft">Bán đơn mới</Link>}
              {r.tableStillOpen && r.tableId && <Link to={`/cashier/bill/${r.tableId}`} className="btn btn-light-soft">Quay lại {r.place}</Link>}
              <Link to="/cashier" className="btn btn-light-soft">Về trang Thanh toán</Link>
            </>
          )}
        </div>
      </div>

      <div className="receipt">
        <div className="text-center">
          <div className="receipt-shop">{r.shopName}</div>
          {r.shopAddress && <div className="cell-sub">{r.shopAddress}</div>}
          {r.shopPhone && <div className="cell-sub">Điện thoại: {r.shopPhone}</div>}
        </div>

        <div className="receipt-title">Hóa đơn thanh toán</div>

        {pickupNo && (
          <div className="receipt-pickup">
            <div className="cell-sub">Số thứ tự nhận đồ</div>
            <div className="receipt-pickup-no">{pickupNo}</div>
          </div>
        )}

        <div className="receipt-row"><span>Số hóa đơn</span><span>{r.paymentCode}</span></div>
        <div className="receipt-row"><span>Thời gian</span><span>{formatDateTime(r.paidAt)}</span></div>
        <div className="receipt-row"><span>{r.takeaway ? 'Hình thức' : 'Bàn'}</span><span>{r.takeaway ? (delivery ? 'Giao hàng' : 'Mang đi') : r.place}</span></div>
        {delivery && r.orders[0] && <div className="receipt-row"><span>Đơn</span><span>{r.orders[0].orderNumber}</span></div>}
        {!r.takeaway && r.orders.length > 0 && (
          <div className="receipt-row"><span>Đơn</span><span>{r.orders.map((o) => o.displayNumber).join(', ')}</span></div>
        )}
        {r.cashierName && <div className="receipt-row"><span>Thu ngân</span><span>{r.cashierName}</span></div>}

        <div className="receipt-items">
          {lines.map((i) => {
            const unit = i.unitPrice + i.sizePrice + i.toppingPrice
            const opts = itemOptionsText(i)
            return (
              <div key={i.id} className="receipt-line">
                <div className="receipt-row"><span className="fw-semibold">{i.itemName}</span><span>{formatMoney(i.subtotal)}</span></div>
                <div className="cell-sub">{i.quantity} × {formatMoney(unit)}{opts ? `, ${opts}` : ''}</div>
              </div>
            )
          })}
        </div>

        <div className="receipt-row"><span>Tạm tính</span><span>{formatMoney(r.subtotal)}</span></div>
        {r.discount > 0 && (
          <div className="receipt-row"><span>Giảm giá ({r.pointsRedeemed} điểm)</span><span>-{formatMoney(r.discount)}</span></div>
        )}
        <div className="receipt-row receipt-grand"><span>Tổng thanh toán</span><span>{formatMoney(r.total)}</span></div>
        <div className="receipt-row"><span>Thanh toán bằng</span><span>{methodLabel(r)}</span></div>

        {/* Iter3 Hoàn tiền: món đã hoàn không còn trong danh sách món ở trên, ghi trong từng phiếu hoàn. */}
        {r.refunds?.length > 0 && (
          <div className="receipt-refunds">
            {r.refunds.map((f) => (
              <div key={f.id} className="receipt-line">
                <div className="receipt-row">
                  <span className="fw-semibold">Hoàn tiền {f.refundCode} ({refundStatus(f).label.toLowerCase()})</span>
                  <span>-{formatMoney(f.amount)}</span>
                </div>
                {f.note && <div className="cell-sub">{f.note}</div>}
              </div>
            ))}
            <div className="receipt-row receipt-grand"><span>Còn lại sau hoàn</span><span>{formatMoney(r.total - r.refundedAmount)}</span></div>
          </div>
        )}

        {r.customer && (
          <div className="receipt-customer">
            <div className="receipt-row"><span>Khách thân thiết</span><span>{r.customer.fullName || r.customer.phoneNumber}</span></div>
            {r.pointsEarned > 0 && <div className="receipt-row"><span>Điểm được cộng</span><span>+{r.pointsEarned}</span></div>}
            <div className="receipt-row"><span>Điểm hiện có</span><span>{r.customer.currentPoints}</span></div>
          </div>
        )}

        <div className="receipt-thanks">Cảm ơn quý khách, hẹn gặp lại!</div>
      </div>
    </>
  )
}
