import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import onlinePaymentApi from '../../api/onlinePaymentApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'

const METHOD = { BANK_TRANSFER: 'chuyển khoản QR', CASH: 'tiền mặt' }

const formatDateTime = (v) => {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v
    : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * ThangNN Iter2 — màn "Online E-Receipt" (UC-C09, BF-03-2). Đường dẫn: /online-receipts?phone=...
 * Khách nhập SĐT nhận hàng, thấy tối đa 20 hóa đơn đơn ONLINE đã thanh toán gần nhất. Không hiện địa chỉ (Q3-A).
 */
export default function OnlineEReceipt() {
  const [params, setParams] = useSearchParams()
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (value) => {
    setError('')
    setLoading(true)
    try {
      setList((await onlinePaymentApi.receipts(value)).data)
    } catch (err) {
      setList(null)
      setError(errorMessage(err, 'Chưa tra được hóa đơn, vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Mở từ trang QR (đã có ?phone=) thì tra luôn.
  useEffect(() => {
    const p = params.get('phone')
    if (p) search(p)
    // chỉ chạy lúc mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const p = phone.trim()
    if (!p) return setError('Vui lòng nhập số điện thoại nhận hàng.')
    setParams({ phone: p }, { replace: true })
    return search(p)
  }

  return (
    <>
      <h1 className="gx-title">Hóa đơn đặt online</h1>

      <form className="op-search op-no-print" onSubmit={submit} noValidate>
        <input type="tel" inputMode="numeric" className="form-control" placeholder="Số điện thoại nhận hàng"
               aria-label="Số điện thoại nhận hàng" maxLength={11} value={phone}
               onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Đang tra…' : 'Xem hóa đơn'}</button>
      </form>

      {error && (
        <div className="gx-alert" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {list && list.length === 0 && (
        <div className="gx-empty">
          <i className="bi bi-receipt gx-empty-icon" aria-hidden="true" />
          <p>Chưa có hóa đơn đặt online nào đã thanh toán với số này.</p>
          <Link to="/online-order" className="btn btn-primary">Đặt món online</Link>
        </div>
      )}

      {list && list.length > 0 && (
        <>
          <p className="gx-muted op-no-print">Hiện tối đa 20 hóa đơn gần nhất. Hóa đơn không ghi địa chỉ giao hàng.</p>
          {list.map((r) => (
            <article className="gx-card op-receipt" key={r.paymentCode}>
              <div className="op-shop">
                <strong>{r.shopName}</strong>
                {r.shopAddress && <div className="gx-muted">{r.shopAddress}</div>}
                {r.shopPhone && <div className="gx-muted">Điện thoại {r.shopPhone}</div>}
              </div>
              <header>
                <span className="gx-order-no">Đơn {r.orderNumber}</span>
                <span className="gx-muted">{formatDateTime(r.paidAt)}</span>
              </header>
              <p className="gx-muted mb-2">
                Hóa đơn {r.paymentCode}, trả bằng {METHOD[r.paymentMethod] || r.paymentMethod}
                {r.customerName ? `, người nhận ${r.customerName}` : ''}
              </p>
              {r.items.map((i) => (
                <div className="gx-order-line" key={i.id}>
                  <span className="gx-order-qty">{i.quantity}×</span>
                  <div className="flex-grow-1">
                    <div>{i.itemName}</div>
                    {itemOptionsText(i) && <div className="gx-muted">{itemOptionsText(i)}</div>}
                  </div>
                  <span>{formatMoney(i.subtotal)}</span>
                </div>
              ))}
              <div className="op-sum">
                <div><span>Tạm tính</span><span>{formatMoney(r.subtotal)}</span></div>
                {r.discount > 0 && <div><span>Giảm bằng {r.pointsRedeemed} điểm</span><span>−{formatMoney(r.discount)}</span></div>}
                <div className="op-total"><span>Đã thanh toán</span><span>{formatMoney(r.total)}</span></div>
                {r.pointsEarned > 0 && <div className="gx-muted"><span>Điểm được cộng</span><span>+{r.pointsEarned}</span></div>}
              </div>
            </article>
          ))}
          <button type="button" className="btn btn-light-soft w-100 op-no-print" onClick={() => window.print()}>
            In hoặc lưu hóa đơn
          </button>
        </>
      )}
    </>
  )
}
