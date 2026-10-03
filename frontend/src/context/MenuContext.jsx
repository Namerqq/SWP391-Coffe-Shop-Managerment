import { createContext, useContext, useEffect, useState } from "react";
import { getMenu, getOptions } from "../api/menuApi";
const MenuContext = createContext(null);
export const useMenu = () => useContext(MenuContext);
export function MenuProvider({ children }) {
  const [menu, setMenu] = useState([]),
    [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const loadMenu = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [drinks, opts] = await Promise.all([getMenu(), getOptions()]);
      setMenu(drinks);
      setOptions(opts);
    } catch (e) {
      setLoadError(e.message || "Không tải được thực đơn.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadMenu();
  }, []);
  return (
    <MenuContext.Provider
      value={{ menu, options, loading, loadError, loadMenu }}
    >
      {children}
    </MenuContext.Provider>
  );
}
