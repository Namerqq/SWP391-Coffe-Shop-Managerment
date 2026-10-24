package com.example.project.dto.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Toàn bộ kết quả tra cứu lịch sử nhập kho của 1 nguyên liệu theo ngày đơn lẻ.
 */
public record IngredientSingleDayReceiptHistoryView(
        Long ingredientId,
        String ingredientName,
        String unit,
        BigDecimal currentQuantity,
        LocalDate targetDate,
        IngredientDailyReceiptSummaryView summary,
        List<IngredientReceiptDetailItemView> items
) {}
