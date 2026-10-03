import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { pageTitles } from "../../utils/pageTitles";
export default function Header({ page }) {
  const { staff, context } = useAuth();
  const { currentTable, editing } = useCart();
  const titles = pageTitles(staff, editing);
  return (
    <header className="topbar">
      <span className="breadcrumb">
        {staff ? "Phục vụ" : "Khách hàng"} <span>/</span> {titles[page][0]}
      </span>
      <div className="user-area">
        <div>
          <strong>
            {staff
              ? context?.staff?.name || "Nhân viên"
              : currentTable?.name || "Khách tại quán"}
          </strong>
          <small>
            {staff
              ? context?.staff?.role || "Waiter"
              : "Chào mừng bạn đến Cafe Shop"}
          </small>
        </div>
        <span className="avatar">{staff ? "PV" : "KH"}</span>
      </div>
    </header>
  );
}
