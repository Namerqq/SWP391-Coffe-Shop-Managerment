package com.example.project.dto.inventory;

import com.example.project.entity.StockTransaction;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Dữ liệu trả về cho 1 giao dịch kho. */
public record StockTransactionView(
        Long id,
        Long inventoryItemId,
        String itemName,
        String transactionType,
        BigDecimal quantity,
        String reason,
        String note,
        String createdByName,
        LocalDateTime createdAt
) {
    public static StockTransactionView from(StockTransaction t) {
        return new StockTransactionView(
                t.getId(),
                t.getInventoryItem().getId(),
                t.getInventoryItem().getItemName(),
                t.getTransactionType(),
                t.getQuantity(),
                t.getReason(),
                t.getNote(),
                t.getCreatedBy().getFullName(),
                t.getCreatedAt()
        );
    }
}
