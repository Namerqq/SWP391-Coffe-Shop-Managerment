package com.example.project.dto.waiter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu báo cáo sự cố làm vỡ / đổ món trước khi giao cho khách (UC-W08 mở rộng).
 * action: REMAKE (Pha lại - Khách đợi) hoặc CANCEL (Hủy món - Khách không đợi).
 */
public record IncidentItemRequest(
        @NotBlank(message = "Hướng xử lý không được để trống (REMAKE hoặc CANCEL).")
        String action,

        @Size(max = 200, message = "Lý do tối đa 200 ký tự.")
        String reason,

        Long penaltyAmount
) {}
