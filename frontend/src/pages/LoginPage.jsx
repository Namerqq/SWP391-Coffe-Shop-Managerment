import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
export default function LoginPage() {
  const { login: loginStaff } = useAuth();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const login = async (e) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await loginStaff(username, password);
      setPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="login-panel panel">
      <div className="login-icon">
        <Icon name="cup" size={28} />
      </div>
      <h1>Đăng nhập phục vụ</h1>
      <p>Sử dụng tài khoản nhân viên để đặt món và quản lý đơn tại bàn.</p>
      <form onSubmit={login}>
        <label className="field">
          Tên đăng nhập
          <input
            required
            maxLength={50}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          Mật khẩu
          <input
            required
            type="password"
            maxLength={100}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          <Icon name="arrow" size={17} />
        </button>
      </form>
      <Link className="text-button" to="/menu">
        Về thực đơn khách hàng
      </Link>
    </section>
  );
}
