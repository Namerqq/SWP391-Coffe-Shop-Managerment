package com.example.project.dto.waiter;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu báo cáo sự cố làm vỡ / đổ món trước khi giao cho khách (UC-W08 mở rộng).
 * action: REMAKE (khách muốn làm lại) hoặc CANCEL (khách không muốn làm lại, hủy món).
 * quantity: số ly bị đổ / vỡ trong dòng (vd 1 trong 2× Latte); bỏ trống = cả dòng.
 * Mức phạt do quản lý quyết định sau, phục vụ không tự nhập.
 */
public record IncidentItemRequest(
        @NotBlank(message = "Hướng xử lý không được để trống (REMAKE hoặc CANCEL).")
        String action,

        @Size(max = 200, message = "Lý do tối đa 200 ký tự.")
        String reason,

        @Min(value = 1, message = "Số ly bị sự cố tối thiểu là 1.")
        Integer quantity
) {}
