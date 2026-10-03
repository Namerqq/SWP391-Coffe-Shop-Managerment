import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import EmptyState from "./EmptyState";
export default function ProtectedRoute() {
  const { contextLoading, isLoggedIn } = useAuth();
  if (contextLoading)
    return (
      <div className="panel">
        <EmptyState title="Đang tải phiên đăng nhập…" />
      </div>
    );
  return isLoggedIn ? <Outlet /> : <LoginPage />;
}
