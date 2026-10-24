package com.example.project.dto.inventory;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Phiếu báo thiếu hàng loạt từ quầy Bar (gom nhiều nguyên liệu).
 */
public record BatchShortageReportRequest(
        String priority, // "URGENT", "NORMAL"
        String note,

        @NotEmpty(message = "Danh sách nguyên liệu yêu cầu không được để trống")
        @Valid
        List<BatchShortageItemRequest> items
) {}
