package com.example.project.dto.inventory;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record StockReceiptRequest(
        @NotBlank(message = "Tên nhà cung cấp không được để trống")
        String supplierName,

        @NotNull(message = "Ngày nhập không được để trống")
        LocalDate receiptDate,

        String note,

        @NotEmpty(message = "Phiếu nhập phải có ít nhất 1 nguyên liệu")
        @Valid
        List<StockReceiptItemRequest> items
) {}
