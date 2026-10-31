import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import onlinePaymentApi from '../../api/onlinePaymentApi'
import { errorMessage } from '../../api/axiosClient'
import { formatMoney, itemOptionsText } from '../../utils/orderFormat'
import { getCurrentOrderCode, isValidOrderCode, normalizeOrderCode } from '../../utils/onlineOrderCode'

const METHOD = { BANK_TRANSFER: 'chuyển khoản QR', CASH: 'tiền mặt' }

const formatDateTime = (v) => {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v
    : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * ThangNN Iter2 — màn "Online E-Receipt" (UC-C09, BF-03-2). Đường dẫn: /online-receipts (đơn đang đặt trên máy này)
 * hoặc /online-receipts?code=261023-0008. Khách chỉ xem hóa đơn của đơn đang đặt; đơn khác phải nhập đúng mã đơn.
 * Không hiện địa chỉ (Q3-A). Đơn chưa thanh toán (COD chưa giao) thì chưa có hóa đơn.
 */
export default function OnlineEReceipt() {
  const [params, setParams] = useSearchParams()
  const currentCode = getCurrentOrderCode()
  const urlCode = normalizeOrderCode(params.get('code'))
  const activeCode = urlCode || currentCode

  const [codeInput, setCodeInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setReceipt(null)
    setError('')
    if (!activeCode) return
    setLoading(true)
    try {
      setReceipt((await onlinePaymentApi.receipt(activeCode)).data)
    } catch (err) {
      setError(errorMessage(err, 'Chưa xem được hóa đơn, vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }, [activeCode])

  useEffect(() => { load() }, [load])

  const submit = (e) => {
    e.preventDefault()
    const code = normalizeOrderCode(codeInput)
    if (!isValidOrderCode(code)) {
      setInputError('Mã đơn có dạng 261023-0008 (xem trong popup hoặc trang thanh toán khi đặt hàng).')
      return
    }
    setInputError('')
    setCodeInput('')
    setParams({ code }, { replace: true })
  }

  const r = receipt
  return (
    <>
      <h1 className="gx-title">Hóa đơn đặt online</h1>

      <form className="op-no-print mb-3" onSubmit={submit} noValidate>
        <div className="op-search mb-1">
          <input type="text" className="form-control" placeholder="Nhập mã đơn để xem hóa đơn khác, ví dụ 261023-0008"
                 aria-label="Mã đơn" maxLength={20} autoComplete="off" value={codeInput}
                 onChange={(e) => setCodeInput(e.target.value)} />
          <button type="submit" className="btn btn-primary text-nowrap" disabled={loading}>Xem hóa đơn</button>
        </div>
        {inputError && <div className="text-danger small">{inputError}</div>}
        {urlCode && currentCode && urlCode !== currentCode && (
          <button type="button" className="btn btn-link btn-sm px-0" onClick={() => setParams({}, { replace: true })}>
            ← Về hóa đơn đơn đang đặt ({currentCode})
          </button>
        )}
      </form>

      {loading && <p className="gx-muted text-center py-4">Đang tải hóa đơn…</p>}

      {!loading && error && (
        <div className="gx-alert" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !activeCode && (
        <div className="gx-empty">
          <i className="bi bi-receipt gx-empty-icon" aria-hidden="true" />
          <p>Máy này chưa đặt đơn online nào. Nếu bạn đã đặt trên máy khác, hãy nhập mã đơn ở trên.</p>
          <Link to="/online-order" className="btn btn-primary">Đặt món online</Link>
        </div>
      )}

      {!loading && r && (
        <>
          <p className="gx-muted op-no-print">Hóa đơn không ghi địa chỉ giao hàng.</p>
          <article className="gx-card op-receipt">
            <div className="op-shop">
              <strong>{r.shopName}</strong>
              {r.shopAddress && <div className="gx-muted">{r.shopAddress}</div>}
              {r.shopPhone && <div className="gx-muted">Điện thoại {r.shopPhone}</div>}
            </div>
            <header>
              <span className="gx-order-no">Đơn #{r.orderNumber}</span>
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
              {r.discount > 0 && <div><span>Giảm giá</span><span>−{formatMoney(r.discount)}</span></div>}
              <div className="op-total"><span>Đã thanh toán</span><span>{formatMoney(r.total)}</span></div>
              {r.refundedAmount > 0 && (
                <div><span>Quán đã hoàn lại{r.refundedAt ? ` (${formatDateTime(r.refundedAt)})` : ''}</span><span>−{formatMoney(r.refundedAmount)}</span></div>
              )}
              {r.refundPendingAmount > 0 && (
                <div><span>Quán đang hoàn lại</span><span>{formatMoney(r.refundPendingAmount)}</span></div>
              )}
            </div>
            {r.refundPendingAmount > 0 && (
              <p className="gx-muted small mt-2 mb-0">
                Đơn đã hủy. Quán sẽ chuyển khoản trả lại vào tài khoản bạn đã dùng để thanh toán.
              </p>
            )}
          </article>
          <button type="button" className="btn btn-light-soft w-100 op-no-print" onClick={() => window.print()}>
            In hoặc lưu hóa đơn
          </button>
        </>
      )}
    </>
  )
}
