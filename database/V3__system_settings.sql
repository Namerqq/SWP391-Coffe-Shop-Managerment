-- Cafe Management System - V3: bảng cấu hình hệ thống (UC-AD06 Configure System Settings)
-- Chạy SAU V1 và V2. Không sửa V1/V2.

CREATE TABLE system_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value VARCHAR(500) NOT NULL,
    data_type VARCHAR(20) NOT NULL DEFAULT 'STRING',
    group_name VARCHAR(30) NOT NULL,
    label VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_by VARCHAR(50) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_system_settings_type CHECK (
        data_type IN ('STRING', 'NUMBER', 'TIME', 'BOOLEAN', 'EMAIL')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO system_settings
    (setting_key, setting_value, data_type, group_name, label, description, sort_order)
VALUES
    ('shop.name', 'Cafe Shop', 'STRING', 'GENERAL', 'Tên quán', 'Hiển thị trên menu, hóa đơn và trang đăng nhập.', 1),
    ('shop.address', '', 'STRING', 'GENERAL', 'Địa chỉ', 'In trên hóa đơn.', 2),
    ('shop.phone', '', 'STRING', 'GENERAL', 'Số điện thoại', NULL, 3),
    ('shop.email', '', 'EMAIL', 'GENERAL', 'Email liên hệ', NULL, 4),
    ('shop.open_time', '07:00', 'TIME', 'GENERAL', 'Giờ mở cửa', 'Ngoài giờ này khách không đặt món qua QR được.', 5),
    ('shop.close_time', '22:00', 'TIME', 'GENERAL', 'Giờ đóng cửa', NULL, 6),

    ('sales.vat_percent', '8', 'NUMBER', 'SALES', 'Thuế VAT (%)', 'Áp dụng khi tính tổng hóa đơn.', 1),
    ('loyalty.vnd_per_point', '10000', 'NUMBER', 'SALES', 'Số tiền đổi 1 điểm (VND)', 'Ví dụ 10000: mỗi 10.000đ thanh toán được 1 điểm.', 2),
    ('payment.qr_timeout_minutes', '15', 'NUMBER', 'SALES', 'Hết hạn QR thanh toán (phút)', 'Quá thời gian này đơn online chưa thanh toán sẽ bị hủy.', 3),

    ('security.max_login_attempts', '5', 'NUMBER', 'SECURITY', 'Số lần đăng nhập sai tối đa', 'Vượt quá sẽ khóa tài khoản (LOCKED). 0 = không giới hạn.', 1),
    ('security.session_timeout_minutes', '120', 'NUMBER', 'SECURITY', 'Thời gian hết phiên (phút)', 'Không thao tác quá thời gian này phải đăng nhập lại.', 2),
    ('security.password_min_length', '6', 'NUMBER', 'SECURITY', 'Độ dài mật khẩu tối thiểu', NULL, 3),
    ('system.maintenance_mode', 'false', 'BOOLEAN', 'SECURITY', 'Chế độ bảo trì', 'Khi bật, chỉ Admin được đăng nhập.', 4);
