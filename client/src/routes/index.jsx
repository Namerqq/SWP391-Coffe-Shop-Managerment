import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home/Home";
import Order from "../pages/Order/Order";
import StaffDashboard from "../pages/Staff/StaffDashboard";

/**
 * routes/
 * Chứa các định tuyến của các trang.
 */
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order" element={<Order />} /> {/* Trang khách đặt hàng */}
      <Route path="/staff" element={<StaffDashboard />} /> {/* Trang nhân viên nhận đơn realtime */}
      {/* Thêm các route khác tại đây */}
    </Routes>
  );
};

export default AppRoutes;
