import { Link, Navigate, useRoutes } from "react-router-dom";
import { orderRoutes } from "./routes/orderRoutes";

export default function App() {
  return useRoutes([
    ...orderRoutes,
    // Standalone demo entry only. Replace with Home when integrating the team app.
    { path: "/", element: <Navigate to="/menu" replace /> },
    {
      path: "*",
      element: (
        <main>
          <h1>Không tìm thấy trang</h1>
          <Link to="/menu">Về thực đơn</Link>
        </main>
      ),
    },
  ]);
}
