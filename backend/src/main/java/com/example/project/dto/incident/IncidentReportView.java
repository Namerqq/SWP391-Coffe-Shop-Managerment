package com.example.project.dto.incident;

import java.time.LocalDateTime;

/** 1 biên bản sự cố trả về cho màn hình Quản lý. itemValue = tiền của dòng món bị đổ / vỡ (để tham khảo mức phạt). */
public record IncidentReportView(
        Long id, Long orderId, String displayNumber, String tableNumber,
        String itemName, int quantity, long itemValue,
        String action, String reason, String reporterName, LocalDateTime createdAt,
        String status, Long penaltyAmount, String managerNote, String reviewerName, LocalDateTime reviewedAt
) {}
