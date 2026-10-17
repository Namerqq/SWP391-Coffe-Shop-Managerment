package com.example.project.dto.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record StockReceiptItemRequest(
        @NotNull(message = "Nguyên liệu không được để trống")
        Long inventoryItemId,

        @NotNull(message = "Số lượng nhập không được để trống")
        @DecimalMin(value = "0.001", message = "Số lượng nhập phải lớn hơn 0")
        BigDecimal quantity,

        @NotNull(message = "Đơn giá nhập không được để trống")
        Long unitCost
) {}
