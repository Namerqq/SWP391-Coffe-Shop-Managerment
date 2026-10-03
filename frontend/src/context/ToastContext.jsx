import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/Icon";
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setError("");
  }, [pathname]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <ToastContext.Provider value={{ error, setError, setNotice }}>
      {children}
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
    </ToastContext.Provider>
  );
}
