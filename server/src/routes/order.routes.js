const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");

/**
 * routes/
 * Định tuyến API cho module Order.
 * POST /api/orders          -> khách đặt hàng
 * GET  /api/orders          -> nhân viên lấy danh sách đơn (load lần đầu)
 * PATCH /api/orders/:id/status -> nhân viên xác nhận / cập nhật trạng thái đơn
 */
router.post("/", orderController.createOrder);
router.get("/", orderController.getOrders);
router.patch("/:id/status", orderController.updateStatus);

module.exports = router;
