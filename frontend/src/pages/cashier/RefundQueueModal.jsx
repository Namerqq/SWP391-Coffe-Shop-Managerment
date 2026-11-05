import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { useToast } from '../../context/ToastContext'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { assetUrl } from '../../utils/assetUrl'
import { formatDateTime } from '../../utils/format'
import { formatMoney, formatTime } from '../../utils/orderFormat'
import { REFUND_METHOD, refundStatus } from './refundFormat'

// Hoàn tiền (ThangNN Iter3) — popup mở từ nút "Hoàn tiền" ở Lịch sử đơn (thay cho màn riêng trước đây).
// 1. Đơn online đã trả QR nhưng đã bị hủy (giao không thành công...) chưa có phiếu hoàn: thu ngân quyết định tạo phiếu.
// 2. Phiếu chờ chuyển khoản trả khách: chuyển khoản xong thì tải ảnh chuyển khoản để hoàn tất.
// 3. Các phiếu hoàn của ngày đang xem ở Lịch sử đơn.
// Tạo phiếu hoàn mở hộp CancelRefundModal ở Lịch sử đơn (onCreate), popup này tạm ẩn rồi hiện lại.

const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PROOF_MAX_BYTES = 5 * 1024 * 1024

const dayLabel = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** show: đang mở; date: ngày đang xem ở Lịch sử đơn (yyyy-mm-dd); onCreate(target): tạo phiếu hoàn cho đơn online đã hủy. */
export default function RefundQueueModal({ show, date, isToday, onClose, onCreate, onChanged }) {
  const toast = useToast()
  const [toRefund, setToRefund] = useState(null)
  const [pending, setPending] = useState(null)
  const [refunds, setRefunds] = useState(null)
  const [error, setError] = useState('')
  const [proofs, setProofs] = useState({}) // id phiếu -> { file, url } ảnh chuyển khoản đang chọn
  const [savingId, setSavingId] = useState(null)
  const requestNo = useRef(0)

  const load = useCallback(async () => {
    const no = ++requestNo.current
    try {
      const [a, b, c] = await Promise.all([
        cashierApi.getOrdersToRefund(), cashierApi.getPendingRefunds(), cashierApi.getRefunds(date),
      ])
      if (no !== requestNo.current) return
      setToRefund(a.data)
      setPending(b.data)
      setRefunds(c.data)
      setError('')
    } catch (e) {
      if (no !== requestNo.current) return
      setError(errorMessage(e, 'Không tải được danh sách hoàn tiền.'))
    }
  }, [date])

  useEffect(() => {
    if (show) load()
  }, [show, load])

  const clearProof = (id) => setProofs((m) => {
    if (m[id]) URL.revokeObjectURL(m[id].url)
    const next = { ...m }
    delete next[id]
    return next
  })

  const pickProof = (id, input) => {
    const file = input.files?.[0]
    if (!file) return
    const problem = !PROOF_TYPES.includes(file.type) ? 'Chỉ nhận ảnh JPG, PNG, WebP.'
      : file.size > PROOF_MAX_BYTES ? 'Ảnh tối đa 5 MB.' : ''
    if (problem) {
      toast(problem, 'error')
      input.value = ''
      return
    }
    setProofs((m) => {
      if (m[id]) URL.revokeObjectURL(m[id].url)
      return { ...m, [id]: { file, url: URL.createObjectURL(file) } }
    })
  }

  const complete = async (r) => {
    const proof = proofs[r.id]
    if (!proof) {
      toast('Chọn ảnh chuyển khoản trả khách trước.', 'error')
      return
    }
    setSavingId(r.id)
    try {
      await cashierApi.completeRefund(r.id, proof.file)
      toast(`Phiếu ${r.refundCode} đã hoàn xong ${formatMoney(r.amount)}.`)
      clearProof(r.id)
      load()
      onChanged?.()
    } catch (e) {
      toast(errorMessage(e, 'Không lưu được.'), 'error')
      if (e.response?.status === 409) load()
    } finally {
      setSavingId(null)
    }
  }

  const dayTotal = (refunds || []).filter((r) => r.status === 'REFUNDED').reduce((s, r) => s + r.amount, 0)
  const loading = !error && (!pending || !toRefund || !refunds)

  return (
    <Modal show={show} size="xl" title="Hoàn tiền" onClose={savingId ? undefined : onClose}
           footer={<button type="button" className="btn btn-light-soft" onClick={onClose} disabled={Boolean(savingId)}>Đóng</button>}>
      <p className="small cf-muted">
        Hoàn món của đơn tại quầy bằng nút "Hoàn tiền" trên từng đơn; hủy đơn online đã trả QR ở Đơn giao hàng.
        Phiếu chuyển khoản chờ ở đây tới khi bạn tải ảnh chuyển khoản.
      </p>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}

      {toRefund?.length > 0 && (
        <section className="refund-section">
          <h6 className="fw-semibold mb-1">Đơn online đã hủy, khách đã trả QR</h6>
          <div className="cell-sub mb-2">Chưa có phiếu hoàn. Giao không thành công do khách thì tùy chính sách quán có hoàn hay không.</div>
          <div className="table-responsive">
            <table className="table cf-table mb-0 align-middle">
              <thead>
                <tr><th>Đơn</th><th>Khách</th><th>Lý do hủy</th><th className="text-end">Đã trả</th><th aria-label="Thao tác" /></tr>
              </thead>
              <tbody>
                {toRefund.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <div className="fw-semibold">{o.orderNumber}</div>
                      <div className="cell-sub">Hủy lúc {formatDateTime(o.cancelledAt)}</div>
                    </td>
                    <td>
                      <div>{o.customerName || 'Khách đặt online'}</div>
                      {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="cell-sub">{o.customerPhone}</a>}
                    </td>
                    <td style={{ maxWidth: 260 }}>{o.cancelReason || '—'}</td>
                    <td className="text-end">
                      <div className="fw-semibold text-nowrap">{formatMoney(o.amount)}</div>
                      {o.paymentReference && <div className="cell-sub text-nowrap">Mã GD khách trả: {o.paymentReference}</div>}
                    </td>
                    <td className="text-end">
                      <button type="button" className="btn btn-sm btn-outline-danger text-nowrap"
                              onClick={() => onCreate({ orderId: o.orderId, label: o.orderNumber, amount: o.amount,
                                customerName: o.customerName, customerPhone: o.customerPhone, cancelReason: o.cancelReason })}>
                        Tạo phiếu hoàn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pending && (
        <section className="refund-section">
          <h6 className="fw-semibold mb-1">Chờ chuyển khoản trả khách</h6>
          <div className="cell-sub mb-2">
            Đơn trả QR: tra mã giao dịch khách trả trong app ngân hàng để thấy tài khoản đã chuyển, rồi chuyển trả đúng tài khoản đó.
          </div>
          {pending.length === 0 ? (
            <div className="cell-sub py-2"><i className="bi bi-check2-circle me-1" />Không có phiếu nào đang chờ chuyển khoản.</div>
          ) : (
            <div className="table-responsive">
              <table className="table cf-table mb-0 align-middle">
                <thead>
                  <tr><th>Phiếu</th><th>Đơn / khách</th><th>Nội dung</th><th className="text-end">Trả khách</th><th>Ảnh chuyển khoản</th></tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="fw-semibold">{r.refundCode}</div>
                        <div className="cell-sub">{formatDateTime(r.createdAt)}{r.cashierName && <> · {r.cashierName}</>}</div>
                      </td>
                      <td>
                        <div>{r.place} · {r.fulfillmentType === 'DELIVERY' ? r.orderNumber : r.displayNumber}</div>
                        {(r.customerName || r.customerPhone) && (
                          <div className="cell-sub">{[r.customerName, r.customerPhone].filter(Boolean).join(' · ')}</div>
                        )}
                        {r.paymentReference && <div className="cell-sub">Mã GD khách trả: {r.paymentReference}</div>}
                      </td>
                      <td className="small" style={{ maxWidth: 260 }}>{r.note}</td>
                      <td className="text-end fw-semibold text-nowrap">{formatMoney(r.amount)}</td>
                      <td style={{ minWidth: 300 }}>
                        <div className="d-flex gap-2">
                          <input type="file" accept={PROOF_TYPES.join(',')} className="form-control form-control-sm"
                                 aria-label={`Ảnh chuyển khoản phiếu ${r.refundCode}`}
                                 onChange={(e) => pickProof(r.id, e.target)} disabled={savingId === r.id} />
                          <button type="button" className="btn btn-sm btn-primary text-nowrap" onClick={() => complete(r)}
                                  disabled={savingId === r.id}>
                            {savingId === r.id && <span className="spinner-border spinner-border-sm me-1" />}Đã chuyển
                          </button>
                        </div>
                        {proofs[r.id] && (
                          <a href={proofs[r.id].url} target="_blank" rel="noreferrer" className="d-inline-block mt-2">
                            <img src={proofs[r.id].url} alt={`Ảnh chuyển khoản đã chọn cho phiếu ${r.refundCode}`}
                                 style={{ maxHeight: 96, maxWidth: '100%' }} className="rounded border" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {refunds && (
        <section className="refund-section">
          <h6 className="fw-semibold mb-2">Phiếu hoàn {isToday ? 'hôm nay' : `ngày ${dayLabel(date)}`}</h6>
          {refunds.length === 0 ? (
            <div className="cell-sub py-2">Chưa có phiếu hoàn nào.</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table cf-table mb-0 align-middle">
                  <thead>
                    <tr><th>Phiếu</th><th>Đơn</th><th>Nội dung</th><th className="text-end">Trả khách</th><th>Trạng thái</th></tr>
                  </thead>
                  <tbody>
                    {refunds.map((r) => {
                      const st = refundStatus(r)
                      return (
                        <tr key={r.id}>
                          <td>
                            <div className="fw-semibold">{r.refundCode}</div>
                            <div className="cell-sub">{formatTime(r.createdAt)}{r.cashierName && <> · {r.cashierName}</>}</div>
                          </td>
                          <td>
                            <div>{r.place} · {r.fulfillmentType === 'DELIVERY' ? r.orderNumber : r.displayNumber}</div>
                            <div className="cell-sub">Hóa đơn {r.paymentCode}</div>
                          </td>
                          <td className="small" style={{ maxWidth: 300 }}>
                            {r.note}
                            {r.proofUrl && (
                              <a href={assetUrl(r.proofUrl)} target="_blank" rel="noreferrer" className="d-block mt-1">
                                <i className="bi bi-image me-1" aria-hidden="true" />Xem ảnh chuyển khoản
                              </a>
                            )}
                          </td>
                          <td className="text-end text-nowrap">
                            <div className="fw-semibold">{formatMoney(r.amount)}</div>
                            <div className="cell-sub">{REFUND_METHOD[r.method] || r.method}</div>
                          </td>
                          <td>
                            <span className={`status-pill tone-${st.tone}`}>{st.label}</span>
                            {r.refundedAt && <div className="cell-sub mt-1">{formatDateTime(r.refundedAt)}</div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-end pt-2">
                Đã trả khách: <strong>{formatMoney(dayTotal)}</strong>
                <span className="cell-sub"> (phiếu đã hoàn xong, tạo trong ngày)</span>
              </div>
            </>
          )}
        </section>
      )}
    </Modal>
  )
}
