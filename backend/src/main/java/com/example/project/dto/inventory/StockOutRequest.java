package com.example.project.dto.inventory;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Dữ liệu từ client khi giảm / xuất / cân chỉnh kho (Stock Out / Adjustment / Waste). */
public record StockOutRequest(
        @NotNull(message = "Số lượng giảm không được để trống.")
        @DecimalMin(value = "0.001", message = "Số lượng giảm phải lớn hơn 0.")
        BigDecimal quantity,

        @NotBlank(message = "Lý do giảm không được để trống.")
        String reasonType, // "ADJUSTMENT" (Nhập sai), "WASTE" (Hư hỏng), "STOCK_OUT" (Xuất khác)

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String note
) {}
