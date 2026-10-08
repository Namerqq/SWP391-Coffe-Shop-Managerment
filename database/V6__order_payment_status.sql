-- Cafe Management System - V6: mỗi đơn có 2 trạng thái SONG SONG (phục vụ + thanh toán).
-- Chạy SAU V5, chạy 1 lần. Không sửa V1..V5.
--
--   orders.status         = tiến trình phục vụ: PENDING_CONFIRMATION (Chờ pha) -> PREPARING (Đang pha)
--                           -> READY (Chờ mang ra) -> COMPLETED (Đã phục vụ) | CANCELLED (Đã hủy)
--   orders.payment_status = UNPAID (Chưa thanh toán) | PAID (Đã thanh toán)
--
-- Thu ngân thu tiền được đơn ở BẤT KỲ trạng thái phục vụ nào (trừ đơn đã hủy).
-- orders.payment_id = hóa đơn (payments) đã thu tiền đơn này; 1 hóa đơn có thể gồm nhiều đơn của cùng 1 bàn.
-- Bàn chỉ trả về trống khi mọi đơn chưa hủy vừa ĐÃ PHỤC VỤ vừa ĐÃ THANH TOÁN.

ALTER TABLE orders
    ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' AFTER status,
    ADD COLUMN paid_at DATETIME NULL AFTER payment_status,
    ADD COLUMN payment_id BIGINT UNSIGNED NULL AFTER paid_at;

-- Điền dữ liệu cũ. MySQL Workbench bật Safe Updates nên tạm tắt cho 2 lệnh UPDATE bên dưới.
SET @old_safe_updates = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- Đơn mang đi đã trả trước: payment gắn thẳng với đơn.
UPDATE orders o
JOIN payments p ON p.order_id = o.order_id AND p.payment_status = 'PAID'
SET o.payment_status = 'PAID', o.paid_at = p.paid_at, o.payment_id = p.payment_id;

-- Bàn đã thanh toán trước V6 (thu cả lượt khách): mọi đơn chưa hủy của lượt đó.
UPDATE orders o
JOIN payments p ON p.table_session_id = o.table_session_id AND p.payment_status = 'PAID'
SET o.payment_status = 'PAID', o.paid_at = p.paid_at, o.payment_id = p.payment_id
WHERE o.status NOT IN ('CANCELLED', 'REJECTED') AND o.payment_id IS NULL;

SET SQL_SAFE_UPDATES = @old_safe_updates;

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    ADD CONSTRAINT chk_orders_payment_status CHECK (payment_status IN ('UNPAID', 'PAID')),
    ADD CONSTRAINT chk_orders_paid CHECK (
        (payment_status = 'UNPAID' AND paid_at IS NULL AND payment_id IS NULL)
        OR (payment_status = 'PAID' AND paid_at IS NOT NULL AND payment_id IS NOT NULL)
    );

CREATE INDEX idx_orders_session_payment ON orders(table_session_id, payment_status);
