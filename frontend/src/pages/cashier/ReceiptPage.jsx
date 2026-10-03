import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime } from '../../utils/format'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import '../../styles/cashier.css'

const METHOD = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' }

// Receipt Preview — SRS screen #8, UC-C09 View and Issue receipt.
export default function ReceiptPage() {
  const { paymentId } = useParams()
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
        <Link to="/cashier" className="btn btn-light-soft">Về trang Thanh toán</Link>
      </div>
    )
  }
  if (!r) return <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>

  const lines = r.orders.flatMap((o) => o.items.filter((i) => i.status !== 'CANCELLED'))
  const pickupNo = r.takeaway && r.orders[0] ? r.orders[0].displayNumber : null

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4 no-print">
        <div>
          <h1 className="page-title">Thanh toán thành công</h1>
          <p className="page-subtitle">Hóa đơn {r.paymentCode}, {formatMoney(r.total)} bằng {METHOD[r.paymentMethod] || r.paymentMethod}.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}><i className="bi bi-printer me-1" />In hóa đơn</button>
          {r.takeaway && <Link to="/cashier/takeaway" className="btn btn-light-soft">Bán đơn mới</Link>}
          <Link to="/cashier" className="btn btn-light-soft">Về trang Thanh toán</Link>
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
        <div className="receipt-row"><span>{r.takeaway ? 'Hình thức' : 'Bàn'}</span><span>{r.takeaway ? 'Mang đi' : r.place}</span></div>
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
        <div className="receipt-row"><span>Thanh toán bằng</span><span>{METHOD[r.paymentMethod] || r.paymentMethod}</span></div>

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
