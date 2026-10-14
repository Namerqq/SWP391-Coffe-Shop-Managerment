-- Cafe Management System - V7: thanh toán QR tự xác nhận qua payOS (ThangNN, BF-03).
-- Chạy SAU V6. Chạy lại nhiều lần cũng không sao (bảng có rồi thì bỏ qua).
--
-- Cột khóa ngoại lấy ĐÚNG KIỂU của cột id đang có trong DB: DB tạo từ V1__schema.sql dùng BIGINT UNSIGNED,
-- DB tạo từ cafe_management_full.sql dùng BIGINT. MySQL không cho khóa ngoại nối 2 kiểu khác nhau (lỗi 3780),
-- nên bảng được tạo bằng câu lệnh ghép (PREPARE / EXECUTE).
--
-- qr_payment_requests = mỗi lần thu ngân tạo 1 mã QR payOS. Chỉ khi payOS báo đã nhận đủ tiền mới tạo
-- dòng payments (PAID), nên số hóa đơn PMyyMMdd-xxxx không bị nhảy số vì các mã QR hết hạn / bị hủy.
--   status      : PENDING (chờ khách quét) -> PAID | EXPIRED | CANCELLED
--                 MISMATCH = tiền đã về nhưng không ghi được vào hóa đơn -> thu ngân kiểm tra, xử lý tay.
--   target_type : TABLE    = thu các đơn tại bàn, danh sách đơn ở bảng qr_payment_request_orders
--                 TAKEAWAY = bán mang đi, CHƯA tạo đơn: giỏ hàng lưu ở cart_json, khách trả xong mới tạo đơn
--   order_code  : mã đơn gửi sang payOS (duy nhất trên payOS, không phụ thuộc id trong DB của từng máy)
--   created_by_user_id : thu ngân tạo mã, cũng là người đứng tên trên hóa đơn khi hệ thống tự xác nhận
--   confirmed_via      : WEBHOOK (payOS gọi về) | POLLING (backend tự hỏi payOS) | CANCEL_CHECK

USE cafe_management;

SET @t_session  = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_sessions' AND COLUMN_NAME = 'table_session_id');
SET @t_customer = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'customer_id');
SET @t_user     = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id');
SET @t_payment  = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_id');
SET @t_order    = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_id');

-- Xem kiểu đã đọc được (5 cột phải có giá trị, NULL nghĩa là DB thiếu bảng đó -> chạy V1..V6 trước).
SELECT @t_session AS table_session_id, @t_customer AS customer_id, @t_user AS user_id,
       @t_payment AS payment_id, @t_order AS order_id;

SET @sql = CONCAT(
    "CREATE TABLE IF NOT EXISTS qr_payment_requests (",
    " qr_request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,",
    " order_code BIGINT UNSIGNED NOT NULL,",
    " payment_link_id VARCHAR(64) NULL,",
    " target_type VARCHAR(20) NOT NULL,",
    " table_session_id ", @t_session, " NULL,",
    " cart_json TEXT NULL,",
    " customer_id ", @t_customer, " NULL,",
    " points_to_redeem INT NOT NULL DEFAULT 0,",
    " subtotal BIGINT UNSIGNED NOT NULL,",
    " amount BIGINT UNSIGNED NOT NULL,",
    " description VARCHAR(25) NOT NULL,",
    " qr_code VARCHAR(1000) NULL,",
    " checkout_url VARCHAR(500) NULL,",
    " status VARCHAR(20) NOT NULL DEFAULT 'PENDING',",
    " expires_at DATETIME NOT NULL,",
    " created_by_user_id ", @t_user, " NULL,",
    " created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,",
    " status_changed_at DATETIME(3) NULL,",
    " paid_at DATETIME NULL,",
    " payment_id ", @t_payment, " NULL,",
    " bank_reference VARCHAR(100) NULL,",
    " confirmed_via VARCHAR(20) NULL,",
    " note VARCHAR(500) NULL,",
    " INDEX idx_qr_requests_status (status, expires_at),",
    " INDEX idx_qr_requests_changed (status_changed_at),",
    " CONSTRAINT uq_qr_requests_order_code UNIQUE (order_code),",
    " CONSTRAINT fk_qr_requests_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(table_session_id),",
    " CONSTRAINT fk_qr_requests_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),",
    " CONSTRAINT fk_qr_requests_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,",
    " CONSTRAINT fk_qr_requests_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id),",
    " CONSTRAINT chk_qr_requests_target CHECK (",
    "   (target_type = 'TABLE' AND table_session_id IS NOT NULL AND cart_json IS NULL)",
    "   OR (target_type = 'TAKEAWAY' AND table_session_id IS NULL AND cart_json IS NOT NULL)),",
    " CONSTRAINT chk_qr_requests_status CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'MISMATCH')),",
    " CONSTRAINT chk_qr_requests_paid CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND payment_id IS NOT NULL)),",
    " CONSTRAINT chk_qr_requests_amount CHECK (amount > 0 AND amount <= subtotal),",
    " CONSTRAINT chk_qr_requests_points CHECK (points_to_redeem >= 0)",
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Các đơn tại bàn được thu trong 1 mã QR. 1 đơn chỉ nằm trong tối đa 1 mã QR đang chờ (backend kiểm tra).
SET @sql = CONCAT(
    "CREATE TABLE IF NOT EXISTS qr_payment_request_orders (",
    " qr_request_id BIGINT UNSIGNED NOT NULL,",
    " order_id ", @t_order, " NOT NULL,",
    " PRIMARY KEY (qr_request_id, order_id),",
    " INDEX idx_qr_orders_order (order_id),",
    " CONSTRAINT fk_qr_orders_request FOREIGN KEY (qr_request_id) REFERENCES qr_payment_requests(qr_request_id) ON DELETE CASCADE,",
    " CONSTRAINT fk_qr_orders_order FOREIGN KEY (order_id) REFERENCES orders(order_id)",
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Thời gian tồn tại mã QR: dùng lại cài đặt payment.qr_timeout_minutes (có từ V3), sửa nhãn + mô tả.
-- INSERT IGNORE phòng trường hợp DB chưa có dòng này; có rồi thì giữ nguyên giá trị Admin đã đặt.
INSERT IGNORE INTO system_settings (setting_key, setting_value, data_type, group_name, label, description, sort_order)
VALUES ('payment.qr_timeout_minutes', '15', 'NUMBER', 'SALES', 'Thời gian tồn tại mã QR (phút)', NULL, 3);

UPDATE system_settings
SET label = 'Thời gian tồn tại mã QR (phút)',
    description = 'Mã QR payOS hết hạn sau số phút này (từ 1 đến 60). Đổi giá trị chỉ áp dụng cho mã tạo sau đó.'
WHERE setting_key = 'payment.qr_timeout_minutes';

-- Kiểm tra: phải ra 2 bảng qr_payment_requests, qr_payment_request_orders
SHOW TABLES LIKE 'qr_payment%';
