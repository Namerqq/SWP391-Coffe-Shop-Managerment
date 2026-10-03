import { Link } from "react-router-dom";
import Icon from "../Icon";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrdersContext";
export default function Sidebar({ page }) {
  const { staff, base } = useAuth();
  const { count } = useCart();
  const { activeOrders } = useOrders();
  return (
    <aside className="sidebar">
      <Link className="brand" to={staff ? "/waiter" : "/menu"}>
        <span className="brand-icon">
          <Icon name="cup" size={25} />
        </span>
        <span>
          <b>Cafe Shop</b>
          <small>{staff ? "Nhân viên phục vụ" : "Đặt món tại bàn"}</small>
        </span>
      </Link>
      <div className="nav-group">
        {staff && (
          <>
            <span className="nav-label">PHỤC VỤ</span>
            <Link
              className={page === "tables" ? "nav-link active" : "nav-link"}
              to="/waiter"
            >
              <Icon name="table" /> Bàn & đơn hàng
            </Link>
          </>
        )}
        <span className="nav-label">THỰC ĐƠN</span>
        <Link
          className={page === "menu" ? "nav-link active" : "nav-link"}
          to={`${base}/menu`}
        >
          <Icon name="menu" /> Món
        </Link>
        <Link
          className={page === "cart" ? "nav-link active" : "nav-link"}
          to={`${base}/cart`}
        >
          <Icon name="bag" /> Giỏ hàng
          {count > 0 && <b className="nav-count">{count}</b>}
        </Link>
        <span className="nav-label">ĐƠN HÀNG</span>
        <Link
          className={page === "orders" ? "nav-link active" : "nav-link"}
          to={`${base}/orders`}
        >
          <Icon name="orders" /> {staff ? "Quản lý đơn" : "Đơn của tôi"}
          {activeOrders.length > 0 && (
            <b className="nav-count">{activeOrders.length}</b>
          )}
        </Link>
      </div>
      <div className="sidebar-bottom">
        <span className="connection-dot" /> Cafe Shop{" "}
        <span>Đặt món · Tại bàn</span>
      </div>
    </aside>
  );
}
