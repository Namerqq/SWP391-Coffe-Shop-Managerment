import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import cashierApi from '../../api/cashierApi'
import { errorMessage } from '../../api/axiosClient'
import { formatDateTime, initials } from '../../utils/format'

// Point History — UC-C12. Chỉ xem: giao dịch điểm không sửa / xóa, thu ngân không cộng / trừ điểm tay (SRS 4.4 [11]).
export const TX_TYPE = {
  EARN: { label: 'Tích điểm', tone: 'ready' },
  REDEEM: { label: 'Dùng điểm', tone: 'pending' },
  ADJUSTMENT: { label: 'Điều chỉnh', tone: 'preparing' },
  REFUND: { label: 'Hoàn điểm', tone: 'cancelled' },
}

const signed = (n) => (n > 0 ? `+${n}` : String(n))

/** customerId = khách đang xem (null = đóng). reloadKey đổi -> tải lại (vd. vừa sửa tên / SĐT). */
export default function LoyaltyHistoryModal({ customerId, reloadKey, onClose, onEdit }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!customerId) return
    let alive = true
    setError('')
    cashierApi.getLoyaltyHistory(customerId)
      .then((res) => { if (alive) setData(res.data) })
      .catch((e) => { if (alive) { setData(null); setError(errorMessage(e, 'Không tải được lịch sử điểm.')) } })
    return () => { alive = false }
  }, [customerId, reloadKey])

  // Đổi sang khách khác -> không hiện tạm dữ liệu của khách trước.
  const shown = data && data.customer.id === customerId ? data : null
  const c = shown?.customer

  return (
    <Modal show={!!customerId} title="Lịch sử điểm" size="lg" onClose={onClose}>
      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {!shown && !error && <div className="empty-state"><span className="spinner-border spinner-border-sm" /> Đang tải...</div>}

      {shown && (
        <>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            <span className="avatar">{initials(c.fullName || 'Khách')}</span>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="fw-semibold text-truncate">{c.fullName || 'Khách thân thiết (chưa có tên)'}</div>
              <div className="cell-sub">{c.phoneNumber} · tham gia {formatDateTime(c.createdAt)}</div>
            </div>
            <button type="button" className="btn btn-light-soft btn-sm" onClick={() => onEdit(c)}>
              <i className="bi bi-pencil me-1" aria-hidden="true" />Sửa thông tin
            </button>
          </div>

          <div className="loyalty-stats mb-3">
            <div>
              <div className="cell-sub">Điểm hiện có</div>
              <div className="loyalty-stat-value">{c.currentPoints}</div>
            </div>
            <div>
              <div className="cell-sub">Đã tích</div>
              <div className="loyalty-stat-value">{shown.totalEarned}</div>
            </div>
            <div>
              <div className="cell-sub">Đã dùng</div>
              <div className="loyalty-stat-value">{shown.totalRedeemed}</div>
            </div>
          </div>

          {shown.transactions.length === 0 ? (
            <div className="empty-state py-4">
              <i className="bi bi-stars" />
              Khách chưa tích hoặc dùng điểm lần nào.
            </div>
          ) : (
            <div className="table-responsive loyalty-history-scroll">
              <table className="table cf-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Loại</th>
                    <th className="text-end">Điểm</th>
                    <th className="text-end">Còn lại</th>
                    <th>Nội dung</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.transactions.map((t) => {
                    const type = TX_TYPE[t.type] || { label: t.type, tone: 'served' }
                    return (
                      <tr key={t.id}>
                        <td className="text-nowrap">{formatDateTime(t.createdAt)}</td>
                        <td><span className={`status-pill tone-${type.tone}`}>{type.label}</span></td>
                        <td className={`text-end fw-semibold text-nowrap ${t.pointsChange > 0 ? 'text-success' : 'text-danger'}`}>
                          {signed(t.pointsChange)}
                        </td>
                        <td className="text-end text-nowrap">{t.balanceAfter}</td>
                        <td style={{ minWidth: 180 }}>
                          <div className="small">{t.note || '—'}</div>
                          {t.paymentId && (
                            <Link to={`/cashier/receipt/${t.paymentId}`} className="small text-decoration-none"
                                  state={{ from: 'history', back: `/cashier/loyalty?customer=${c.id}`, backLabel: 'Quay lại khách thân thiết' }}>
                              <i className="bi bi-receipt me-1" aria-hidden="true" />Xem hóa đơn {t.paymentCode}
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
          <p className="cell-sub mt-3 mb-0">
            Điểm chỉ thay đổi khi thanh toán tại quầy (tích điểm theo số tiền thực trả, dùng điểm để giảm giá). Lịch sử điểm không sửa hoặc xóa được.
          </p>
        </>
      )}
    </Modal>
  )
}
