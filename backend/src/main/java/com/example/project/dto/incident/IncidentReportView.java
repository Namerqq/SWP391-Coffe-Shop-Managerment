package com.example.project.dto.incident;

import java.time.LocalDateTime;

/**
 * 1 biên bản sự cố trả về cho màn hình Quản lý. itemValue = tiền của dòng món bị đổ / vỡ (để tham khảo mức phạt).
 * source = ai / cái gì tạo biên bản (xem IncidentReportService.sourceOf):
 *   WAITER  - phục vụ báo làm đổ / vỡ (lỗi của người báo, quản lý có thể phạt)
 *   CASHIER - thu ngân bỏ / hoàn tiền món đã pha nhưng chưa mang ra (chỉ ghi nhận hao hụt, không phạt người báo)
 *   SYSTEM  - job cuối ngày tự hủy món đã pha nhưng chưa mang ra (chỉ ghi nhận hao hụt)
 */
public record IncidentReportView(
        Long id, Long orderId, String displayNumber, String tableNumber,
        String itemName, int quantity, long itemValue,
        String action, String reason, String reporterName, String source, LocalDateTime createdAt,
        String status, Long penaltyAmount, String managerNote, String reviewerName, LocalDateTime reviewedAt
) {}
