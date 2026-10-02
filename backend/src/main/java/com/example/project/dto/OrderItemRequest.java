package com.example.project.dto;

import jakarta.validation.constraints.*;

/**
 * 1 món khách chọn. Giá KHÔNG gửi từ client, server tự tính để tránh bị sửa giá.
 * sugarLevel / iceLevel để trống = mặc định của quán.
 */
public record OrderItemRequest(
        @NotNull(message = "Thiếu món") Long menuItemId,
        @NotNull(message = "Thiếu số lượng") @Min(value = 1, message = "Số lượng phải >= 1") @Max(value = 50, message = "Số lượng tối đa 50") Integer quantity,
        @Pattern(regexp = "0%|30%|50%|70%|100%", message = "Mức đường không hợp lệ") String sugarLevel,
        @Pattern(regexp = "0%|50%|100%", message = "Mức đá không hợp lệ") String iceLevel,
        @Size(max = 300, message = "Ghi chú tối đa 300 ký tự") String note
) {}
