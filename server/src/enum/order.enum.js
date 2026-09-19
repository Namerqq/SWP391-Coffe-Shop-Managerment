/**
 * enum/
 * Trạng thái của đơn hàng.
 */
const ORDER_STATUS = Object.freeze({
  PENDING: "PENDING", // vừa đặt, chờ xác nhận
  CONFIRMED: "CONFIRMED", // nhân viên đã xác nhận
  COMPLETED: "COMPLETED", // hoàn tất
  CANCELLED: "CANCELLED", // đã huỷ
});

module.exports = { ORDER_STATUS };
