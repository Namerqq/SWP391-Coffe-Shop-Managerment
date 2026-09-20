const orderService = require("../services/order.service");
const { success, error } = require("../utils/response.util");
const { getIO } = require("../sockets/socket");

/**
 * controllers/
 * Khi khách đặt hàng xong (createOrder):
 * 1) Lưu đơn vào Database qua Service
 * 2) Trả Response(8) xác nhận cho khách hàng
 * 3) Đồng thời emit sự kiện "new-order" qua Socket.IO để màn hình
 *    Nhân viên (đang lắng nghe phòng "staff") nhận đơn NGAY LẬP TỨC,
 *    không cần load lại trang.
 */
const createOrder = async (req, res) => {
  try {
    const newOrder = await orderService.createOrder(req.body);

    // (8) trả response xác nhận cho khách hàng vừa đặt đơn
    success(res, newOrder, "Đặt hàng thành công! Đơn của bạn đang được xử lý.", 201);

    // Bắn realtime cho tất cả nhân viên đang mở dashboard
    getIO().to("staff").emit("new-order", newOrder);
  } catch (err) {
    return error(res, err.message);
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    return success(res, orders);
  } catch (err) {
    return error(res, err.message);
  }
};

const updateStatus = async (req, res) => {
  try {
    const updated = await orderService.updateOrderStatus(req.params.id, req.body.status);

    success(res, updated, "Cập nhật trạng thái thành công!");

    // Báo realtime cho mọi người biết đơn này vừa được cập nhật
    // (vd: khách hàng cũng có thể lắng nghe để biết đơn đã được xác nhận)
    getIO().emit("order-updated", updated);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { createOrder, getOrders, updateStatus };
