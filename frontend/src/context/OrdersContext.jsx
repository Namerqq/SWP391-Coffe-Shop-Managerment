import { createContext, useContext, useEffect, useState } from "react";
import { getOrders } from "../api/orderApi";
import { getTables } from "../api/tableApi";
import { useAuth } from "./AuthContext";
const OrdersContext = createContext(null);
export const useOrders = () => useContext(OrdersContext);
export function OrdersProvider({ children }) {
  const { staff, contextLoading, isLoggedIn, expireSession } = useAuth();
  const [orders, setOrders] = useState([]),
    [tables, setTables] = useState([]);
  const [dataLoading, setDataLoading] = useState(false),
    [dataError, setDataError] = useState("");
  useEffect(() => {
    if (contextLoading || (staff && !isLoggedIn)) {
      setOrders([]);
      setTables([]);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setDataLoading(true);
    const load = async () => {
      try {
        const [items, tableList] = await Promise.all([
          getOrders(staff, controller.signal),
          staff ? getTables(controller.signal) : Promise.resolve([]),
        ]);
        if (active) {
          setOrders(items);
          if (staff) setTables(tableList);
          setDataError("");
        }
      } catch (e) {
        if (active && e.name !== "AbortError") {
          setDataError(e.message);
          if (staff && [401, 403].includes(e.status)) expireSession();
        }
      } finally {
        if (active) setDataLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, [contextLoading, isLoggedIn, staff]);
  const refresh = async () => {
    setDataLoading(true);
    try {
      const [items, ts] = await Promise.all([
        getOrders(staff),
        staff ? getTables() : Promise.resolve([]),
      ]);
      setOrders(items);
      if (staff) setTables(ts);
      setDataError("");
    } catch (e) {
      setDataError(e.message);
    } finally {
      setDataLoading(false);
    }
  };

  const activeOrders = orders.filter(
    (o) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(o.status),
  );
  return (
    <OrdersContext.Provider
      value={{
        orders,
        setOrders,
        tables,
        setTables,
        dataLoading,
        dataError,
        refresh,
        activeOrders,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}
