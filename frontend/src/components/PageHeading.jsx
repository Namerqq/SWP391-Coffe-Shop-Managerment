import { Link } from "react-router-dom";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useOrders } from "../context/OrdersContext";
import { pageTitles } from "../utils/pageTitles";
export default function PageHeading({ page }) {
  const { staff, base } = useAuth();
  const { editing, count } = useCart();
  const { dataLoading, refresh } = useOrders();
  const titles = pageTitles(staff, editing);
  return (
    <div className="page-heading">
      <div>
        <h1>{titles[page][0]}</h1>
        <p>{titles[page][1]}</p>
      </div>
      {page === "menu" ? (
        <Link className="button primary" to={`${base}/cart`}>
          <Icon name="bag" size={18} /> Xem giỏ hàng
          {count > 0 ? ` (${count})` : ""}
        </Link>
      ) : page === "cart" ? (
        <Link className="button secondary" to={`${base}/menu`}>
          <Icon name="plus" size={17} /> Thêm món
        </Link>
      ) : (
        <button
          className="button secondary"
          disabled={dataLoading}
          onClick={refresh}
        >
          <Icon name="clock" size={17} />{" "}
          {dataLoading ? "Đang tải…" : "Làm mới"}
        </button>
      )}
    </div>
  );
}
