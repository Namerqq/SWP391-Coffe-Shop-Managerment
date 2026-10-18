package com.example.project.dto.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ShortageReportRequest(
        @NotNull(message = "Nguyên liệu báo thiếu không được để trống")
        Long inventoryItemId,

        @NotNull(message = "Số lượng yêu cầu bổ sung không được để trống")
        @DecimalMin(value = "0.001", message = "Số lượng yêu cầu bổ sung phải lớn hơn 0")
        BigDecimal requestedQuantity,

        String note
) {}
