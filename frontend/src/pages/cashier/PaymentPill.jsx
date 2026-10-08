// Nhãn "đã thanh toán chưa" của 1 đơn. Đi cạnh nhãn phục vụ (StatusPill): 2 trạng thái song song.
export const isPaid = (order) => order.paymentStatus === 'PAID'

export default function PaymentPill({ order }) {
  const paid = isPaid(order)
  return (
    <span className={`pay-pill ${paid ? 'is-paid' : 'is-unpaid'}`}>
      <i className={`bi ${paid ? 'bi-check2-circle' : 'bi-wallet2'}`} aria-hidden="true" />
      {paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
    </span>
  )
}
