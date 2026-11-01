-- V9: Hoàn tiền (ThangNN Iter3, Template 6 "Refund and Loyalty Reversal").
-- Chạy 1 lần trên database đang dùng (sau V8). Chọn đúng schema trước khi chạy,
-- ví dụ: USE cafe_management;
--
-- Không thêm bảng mới. Mỗi lần hoàn tiền = 1 dòng payments "chiều ngược lại":
--   order_id       = đơn được hoàn (hóa đơn gốc = orders.payment_id của đơn đó)
--   payment_code   = RFyyMMdd-0001
--   total_amount   = số tiền trả lại khách
--   payment_status = REFUND_PENDING (chờ chuyển khoản trả khách) / REFUNDED (đã trả xong)
--   paid_at        = lúc tạo phiếu; khi trả xong cập nhật = lúc trả (doanh thu trừ theo giờ này)
--   note           = cột mới: món được hoàn, lý do, điểm bị trừ / trả lại, mã giao dịch chuyển khoản trả khách
-- REFUND_PENDING / REFUNDED và loyalty_transactions.transaction_type = 'REFUND' đã có sẵn từ V1, không sửa CHECK.
-- Câu truy vấn doanh thu / tiền đã thu chỉ lấy payment_status = 'PAID' nên dòng hoàn không bị cộng nhầm.
USE cafe_management;
ALTER TABLE payments ADD COLUMN note VARCHAR(500) NULL AFTER paid_at;
