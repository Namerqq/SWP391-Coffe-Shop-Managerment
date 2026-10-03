export const pageTitles = (staff, editing) => ({
  menu: ["Thực đơn", "Chọn món yêu thích và tùy chỉnh theo khẩu vị của bạn."],
  cart: [
    editing ? "Chỉnh sửa đơn" : "Xác nhận đơn hàng",
    "Kiểm tra món, số lượng và bàn phục vụ trước khi gửi đến quầy.",
  ],
  orders: [
    staff ? "Quản lý đơn hàng" : "Đơn hàng của tôi",
    staff
      ? "Theo dõi đơn tại bàn. Chỉ sửa hoặc hủy khi đơn đang chờ xác nhận."
      : "Theo dõi món của bạn từ lúc đặt đến khi hoàn tất.",
  ],
  tables: [
    "Bàn & đơn hàng",
    "Chọn bàn để hỗ trợ khách đặt món và theo dõi các đơn đang xử lý.",
  ],
});
