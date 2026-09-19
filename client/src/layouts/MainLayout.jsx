import { Link } from "react-router-dom";

/**
 * layouts/
 * Chứa các bố cục như header, main, footer,...
 */
const MainLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <header className="app-header" style={{ display: "flex", gap: 16 }}>
        <Link to="/" style={{ color: "#fff" }}>Trang chủ</Link>
        <Link to="/order" style={{ color: "#fff" }}>Đặt hàng (Khách)</Link>
        <Link to="/staff" style={{ color: "#fff" }}>Dashboard (Nhân viên)</Link>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">Footer</footer>
    </div>
  );
};

export default MainLayout;
