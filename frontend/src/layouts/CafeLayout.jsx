import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar";
import Header from "../components/navigation/Header";
import Footer from "../components/navigation/Footer";
import ErrorAlert from "../components/ErrorAlert";
import { ToastProvider } from "../context/ToastContext";
import { AuthProvider } from "../context/AuthContext";
import { MenuProvider } from "../context/MenuContext";
import { OrdersProvider } from "../context/OrdersContext";
import { CartProvider } from "../context/CartContext";
export default function CafeLayout({ staff = false }) {
  const { pathname } = useLocation();
  const page = pathname.endsWith("/orders")
    ? "orders"
    : pathname.endsWith("/cart")
      ? "cart"
      : staff && !pathname.endsWith("/menu")
        ? "tables"
        : "menu";
  return (
    <ToastProvider>
      <AuthProvider staff={staff}>
        <MenuProvider>
          <OrdersProvider>
            <CartProvider>
              <div className="shop">
                <Sidebar page={page} />
                <div className="main-shell">
                  <Header page={page} />
                  <main>
                    <ErrorAlert />
                    <Outlet />
                  </main>
                  <Footer />
                </div>
              </div>
            </CartProvider>
          </OrdersProvider>
        </MenuProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
