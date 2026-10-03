import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSession, loginStaff, logoutStaff } from "../api/authApi";
import { selectCustomerTable } from "../api/tableApi";
import { useToast } from "./ToastContext";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ staff, children }) {
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const { search } = useLocation();
  const { setError } = useToast();
  useEffect(() => {
    let active = true;
    getSession()
      .then((c) => {
        if (active) setContext(c);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setContextLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  // Wait for the session cookie before binding a QR table.
  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get("table") || params.get("qr");
    if (staff || !code || contextLoading || context?.fixedTable) return;
    let active = true;
    selectCustomerTable(code)
      .then((table) => {
        if (active) setContext((c) => ({ ...c, table }));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [search, staff, contextLoading, context?.fixedTable]);
  const login = async (username, password) => {
    const user = await loginStaff(username.trim(), password);
    setContext((c) => ({ ...c, staff: user }));
  };
  const logout = async () => {
    await logoutStaff();
    setContext((c) => ({ ...c, staff: null }));
  };
  const bindTable = async (code) => {
    const table = await selectCustomerTable(code.trim());
    setContext((c) => ({ ...c, table }));
    return table;
  };
  const expireSession = () => setContext((c) => ({ ...c, staff: null }));
  return (
    <AuthContext.Provider
      value={{
        staff,
        base: staff ? "/waiter" : "",
        context,
        contextLoading,
        isLoggedIn: !!context?.staff,
        login,
        logout,
        bindTable,
        expireSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
