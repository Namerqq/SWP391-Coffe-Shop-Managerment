import { useEffect, useState } from "react";
import socket from "../../api/socketClient";
import orderService from "../../services/order.service";

/**
 * pages/Staff/StaffDashboard.jsx
 * Trang NHÂN VIÊN, hiển thị đơn hàng REALTIME.
 *
 * - Khi mount: load danh sách đơn hiện có (REST, để không bị trống khi mới mở trang)
 * - Đồng thời connect socket, join phòng "staff"
 * - Khi server emit "new-order" (ngay sau khi khách xác nhận đặt hàng),
 *   đơn mới được thêm vào ĐẦU danh sách ngay lập tức, không cần F5 lại trang.
 */
const StaffDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 1) Load danh sách đơn ban đầu
    const fetchOrders = async () => {
      try {
        const res = await orderService.getAll();
        setOrders(res.data || []);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách đơn:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();

    // 2) Kết nối socket + vào phòng "staff"
    socket.connect();
    socket.emit("join-staff-room");

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // 3) Lắng nghe đơn mới -> thêm vào đầu danh sách (không cần load lại trang)
    socket.on("new-order", (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    // 4) Lắng nghe cập nhật trạng thái đơn (nếu có nơi khác đổi trạng thái)
    socket.on("order-updated", (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    });

    // Dọn dẹp khi rời trang, tránh rò rỉ kết nối / listener trùng lặp
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new-order");
      socket.off("order-updated");
      socket.disconnect();
    };
  }, []);

  const handleConfirm = async (id) => {
    try {
      await orderService.updateStatus(id, "CONFIRMED");
      // Không cần tự cập nhật state ở đây vì server sẽ emit "order-updated" về
    } catch (err) {
      console.error("Lỗi khi xác nhận đơn:", err);
    }
  };

  if (loading) return <p>Đang tải danh sách đơn...</p>;

  return (
    <div>
      <h1>
        Danh sách đơn hàng{" "}
        <span style={{ fontSize: 14, color: connected ? "green" : "red" }}>
          ({connected ? "● Đang kết nối realtime" : "● Mất kết nối"})
        </span>
      </h1>

      {orders.length === 0 && <p>Chưa có đơn hàng nào.</p>}

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Món</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td>{order.customerName}</td>
              <td>
                {order.items?.map((it) => `${it.name} x${it.quantity}`).join(", ")}
              </td>
              <td>{order.total?.toLocaleString()} đ</td>
              <td>{order.status}</td>
              <td>
                {order.status === "PENDING" && (
                  <button onClick={() => handleConfirm(order._id)}>Xác nhận</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffDashboard;
