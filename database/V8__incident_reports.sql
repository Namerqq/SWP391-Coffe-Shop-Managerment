-- V8: Biên bản sự cố làm đổ / vỡ món của phục vụ (incident_reports).
-- Chạy 1 lần trên database đang dùng (sau FREEZE 1.0). Chọn đúng schema trước khi chạy,
-- ví dụ: USE cafe_management;
--
-- Luồng:
--   1. Phục vụ làm đổ / vỡ 1 món đang "Chờ mang ra" -> tạo 1 dòng, status = PENDING.
--      action = REMAKE: khách muốn làm lại, món quay về "Chờ pha" cho pha chế làm lại.
--      action = CANCEL: khách không muốn làm lại, món bị hủy (không tính tiền).
--   2. Quản lý xem biên bản, nhập mức phạt (0 = không phạt) và ghi chú -> status = REVIEWED.
-- Thông tin này là nội bộ: không ghi vào ghi chú món (order_items.note) nên khách không thấy.
USE cafe_management;
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
