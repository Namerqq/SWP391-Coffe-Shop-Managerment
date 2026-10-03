import CustomerLayout from "../layouts/CustomerLayout";
import CustomerMenu from "../pages/customer/CustomerMenu";
import OrderConfirmation from "../pages/customer/OrderConfirmation";
import OrderTracking from "../pages/customer/OrderTracking";

// Add these alongside the team's home/auth/serving/payment routes.
// This module does not claim /, /login, /logout or a wildcard route.
export const orderRoutes = [
  {
    element: <CustomerLayout />,
    children: [
      { path: "/menu", element: <CustomerMenu /> },
      { path: "/cart", element: <OrderConfirmation /> },
      { path: "/orders", element: <OrderTracking /> },
    ],
  },
];
