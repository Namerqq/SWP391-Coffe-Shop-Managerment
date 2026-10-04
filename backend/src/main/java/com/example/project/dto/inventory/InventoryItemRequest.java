package com.example.project.dto.inventory;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Dữ liệu từ client khi tạo hoặc cập nhật nguyên liệu kho. */
public record InventoryItemRequest(
        @NotBlank(message = "Tên nguyên liệu không được để trống.")
        @Size(max = 120, message = "Tên nguyên liệu tối đa 120 ký tự.")
        String itemName,

        @NotBlank(message = "Đơn vị không được để trống.")
        @Size(max = 30, message = "Đơn vị tối đa 30 ký tự.")
        String unit,

        @NotNull(message = "Mức tồn tối thiểu không được để trống.")
        @DecimalMin(value = "0", message = "Mức tồn tối thiểu không được âm.")
        BigDecimal minimumStockLevel,

        @NotNull(message = "Giá nhập không được để trống.")
        @Min(value = 0, message = "Giá nhập không được âm.")
        Long unitCost,

        /** Số lượng ban đầu (chỉ dùng khi TẠO MỚI → tạo giao dịch INITIAL). */
        @DecimalMin(value = "0", message = "Số lượng ban đầu không được âm.")
        BigDecimal openingQuantity
) {}
