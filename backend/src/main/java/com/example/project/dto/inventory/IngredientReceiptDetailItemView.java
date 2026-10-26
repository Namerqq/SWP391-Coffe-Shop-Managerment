package com.example.project.dto.inventory;

import java.math.BigDecimal;

/**
 * Một dòng chi tiết đợt nhập kho trong ngày của nguyên liệu.
 */
public record IngredientReceiptDetailItemView(
        Long receiptId,
        String receiptCode,
        String receiptTime, // Định dạng HH:mm, ví dụ "14:30"
        String supplierName,
        BigDecimal quantity,
        Long unitCost,
        Long subtotal,
        Long newAverageCost,
        String createdByName,
        String note
) {}
