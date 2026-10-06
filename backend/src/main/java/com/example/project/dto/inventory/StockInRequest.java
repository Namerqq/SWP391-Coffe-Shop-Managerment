package com.example.project.dto.inventory;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Dữ liệu từ client khi nhập kho (Stock In). */
public record StockInRequest(
        @NotNull(message = "Số lượng nhập không được để trống.")
        @DecimalMin(value = "0.001", message = "Số lượng nhập phải lớn hơn 0.")
        BigDecimal quantity,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String note
) {}
