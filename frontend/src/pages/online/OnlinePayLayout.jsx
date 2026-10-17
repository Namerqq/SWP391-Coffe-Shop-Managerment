import { Link, Outlet } from 'react-router-dom'
import '../../styles/guest.css'
import '../../styles/online-pay.css'

/** ThangNN Iter2: khung chung các màn thanh toán online (cùng giao diện với trang đặt hàng online). */
export default function OnlinePayLayout() {
  return (
    <div className="gx-shell">
      <header className="gx-header">
        <div className="gx-header-inner" style={{ justifyContent: 'center' }}>
          <Link to="/" className="gx-brand" title="Về trang chủ">
            <span className="gc-logo-text sm">
              <span className="gc-brick-mark" aria-hidden="true"><i /><i /><i /></span>
              <span className="gc-logo-words">
                <b>Gạch</b> <small>Coffee</small>
              </span>
            </span>
          </Link>
        </div>
      </header>
      <main className="gx-main">
        <Outlet />
      </main>
    </div>
  )
}
