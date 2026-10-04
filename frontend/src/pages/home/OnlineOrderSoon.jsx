import { Link, useOutletContext } from 'react-router-dom'

// "Đặt hàng online" — Iter1 chưa có chức năng đặt hàng (Online Menu / Cart / Checkout làm ở Iter2).
export default function OnlineOrderSoon() {
  const { content } = useOutletContext()
  const brand = content['home.brand.name'] || 'Gạch Coffee'
  return (
    <section className="gc-section gc-soon">
      <div className="gc-container">
        <span className="gc-brick-mark lg" aria-hidden="true"><i /><i /><i /></span>
        <h1>Đặt hàng online sắp ra mắt</h1>
        <p>
          Bạn sẽ sớm chọn món {brand} ngay trên web, trả bằng QR hoặc khi nhận hàng.
          Trong lúc chờ, bạn có thể xem thực đơn hoặc ghé quán.
        </p>
        <div className="gc-actions">
          <Link to="/thuc-don" className="gc-btn gc-btn-primary">Xem thực đơn</Link>
          <Link to="/" state={{ scrollTo: 'dia-chi' }} className="gc-btn gc-btn-outline">Xem địa chỉ quán</Link>
        </div>
      </div>
    </section>
  )
}
