# Database — Cafe Management System (Gạch Coffee)

Chỉ còn **1 file**: `cafe_management.sql`. File này đã gộp toàn bộ FREEZE 1.0 (V1 → V7), V8 biên bản sự cố,
V9 hoàn tiền và V10 phí ship theo đơn. Các file `cafe_management_FREEZE_1.0.sql`, `V8__incident_reports.sql`,
`V9__refund_note.sql` đã bỏ.

## Nội dung

- 20 bảng: `roles`, `users`, `customers`, `categories`, `menu_items`, `cafe_tables`, `table_sessions`, `orders`,
  `order_items`, `deliveries`, `payments`, `loyalty_transactions`, `inventory_items`, `stock_receipts`,
  `stock_receipt_items`, `stock_transactions`, `system_settings`, `qr_payment_requests`,
  `qr_payment_request_orders`, `incident_reports`.
- Dữ liệu mặc định: 5 role, cài đặt hệ thống (cửa hàng, bán hàng, phí ship, bảo mật, nội dung trang chủ).
- Menu demo: 7 danh mục, 20 món bán riêng (13 đồ uống, 3 bánh, 4 topping) và 2 size M/L. Ảnh để trống.
- Không có tài khoản, bàn, khách, đơn, thanh toán. Backend tự tạo Admin mặc định nếu chưa có; bàn tạo ở màn quản lý.
- Lựa chọn size / đường / đá theo món và topping theo món lưu ở `system_settings` (khóa `menu.customization.*`,
  `menu.topping.*`), do backend tự tạo khi quản lý cấu hình, không cần bảng riêng.

## Cài mới (MySQL Workbench)

1. MySQL 8.0.16 trở lên (cần CHECK constraint).
2. Mở `cafe_management.sql`, chạy toàn bộ. File tự tạo và chọn schema `cafe_management`.
3. Cấu hình `DB_URL`, `DB_USER`, `DB_PASSWORD` rồi chạy backend.

Muốn cài lại từ đầu thì xóa schema cũ trước (`DROP DATABASE cafe_management;`, mất hết dữ liệu) rồi chạy lại file.
Backend dùng `ddl-auto=none`, không tự tạo / sửa bảng: database thiếu cột nào thì chỗ dùng cột đó sẽ lỗi.

## Nâng cấp database đang chạy (không muốn mất dữ liệu)

Chạy những đoạn mà database của bạn còn thiếu, theo thứ tự. Chạy rồi thì bỏ qua (chạy lại sẽ báo lỗi trùng).

```sql
USE cafe_management;

-- V8: biên bản sự cố (thiếu bảng incident_reports thì chạy)
CREATE TABLE incident_reports (
    incident_report_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_item_id BIGINT UNSIGNED NOT NULL,
    reported_by_user_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(20) NOT NULL,
    reason VARCHAR(300) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    penalty_amount BIGINT UNSIGNED NULL,
    manager_note VARCHAR(300) NULL,
    reviewed_by_user_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_reports_item FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
    CONSTRAINT fk_incident_reports_reporter FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id),
    CONSTRAINT fk_incident_reports_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(user_id),
    CONSTRAINT chk_incident_reports_action CHECK (action IN ('REMAKE', 'CANCEL')),
    CONSTRAINT chk_incident_reports_status CHECK (status IN ('PENDING', 'REVIEWED')),
    CONSTRAINT chk_incident_reports_reviewed CHECK (
        status <> 'REVIEWED' OR (penalty_amount IS NOT NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE INDEX idx_incident_reports_status_created ON incident_reports(status, created_at);

-- V9: hoàn tiền (thiếu cột payments.note thì chạy)
ALTER TABLE payments ADD COLUMN note VARCHAR(500) NULL AFTER paid_at;

-- Phí ship (thiếu dòng cài đặt delivery.shipping_fee thì chạy)
INSERT INTO system_settings (setting_key, setting_value, data_type, group_name, label, description, sort_order)
VALUES ('delivery.shipping_fee', '25000', 'NUMBER', 'SALES', 'Phí ship mỗi đơn giao hàng (VND)',
        'Cộng vào mỗi đơn giao hàng online: trả QR thì gồm trong mã QR, trả khi nhận hàng thì phục vụ thu cùng tiền món. Đổi giá trị chỉ áp dụng cho đơn đặt sau đó.', 8);

-- V10: phí ship chốt theo đơn (mọi database cũ đều phải chạy)
ALTER TABLE deliveries ADD COLUMN shipping_fee BIGINT UNSIGNED NULL AFTER failure_reason;
UPDATE system_settings
SET description = 'Cộng vào mỗi đơn giao hàng online: trả QR thì gồm trong mã QR, trả khi nhận hàng thì phục vụ thu cùng tiền món. Đổi giá trị chỉ áp dụng cho đơn đặt sau đó.'
WHERE setting_key = 'delivery.shipping_fee';
```

Kiểm tra nhanh database đang thiếu gì:

```sql
SHOW TABLES LIKE 'incident_reports';
SHOW COLUMNS FROM payments LIKE 'note';
SHOW COLUMNS FROM deliveries LIKE 'shipping_fee';
SELECT setting_key FROM system_settings WHERE setting_key = 'delivery.shipping_fee';
```

## Quy ước

- Hoàn tiền: mỗi lần hoàn là 1 dòng `payments` có `payment_status` = `REFUND_PENDING` / `REFUNDED`, mã `RF...`,
  gắn `order_id` của đơn được hoàn. Query cộng tiền trên `payments` phải lọc theo `payment_status`.
- Phí ship: `deliveries.shipping_fee` chốt lúc tạo đơn giao hàng. Hóa đơn (`payments.total_amount`) của đơn giao hàng
  gồm cả phí ship, cả khi trả QR lẫn trả khi nhận hàng. `NULL` = đơn tạo trước V10 (hiển thị theo phí ship hiện tại).
- Có thay đổi schema mới: sửa thẳng `cafe_management.sql` và thêm đoạn nâng cấp vào mục trên, không tạo file V11 riêng.
