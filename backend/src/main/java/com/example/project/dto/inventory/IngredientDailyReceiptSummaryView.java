package com.example.project.dto.inventory;

import java.math.BigDecimal;

/**
 * Thẻ tóm tắt số liệu nhập kho trong ngày của nguyên liệu.
 */
public record IngredientDailyReceiptSummaryView(
        long totalReceipts,
        BigDecimal totalQuantity,
        long totalCost
) {}
