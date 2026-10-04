package com.example.project.dto.inventory;

import com.example.project.entity.InventoryItem;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Dữ liệu trả về cho 1 nguyên liệu kho. */
public record InventoryItemView(
        Long id,
        String itemName,
        String unit,
        BigDecimal currentQuantity,
        BigDecimal minimumStockLevel,
        Long unitCost,
        String status,
        boolean lowStock,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static InventoryItemView from(InventoryItem i) {
        return new InventoryItemView(
                i.getId(), i.getItemName(), i.getUnit(),
                i.getCurrentQuantity(), i.getMinimumStockLevel(), i.getUnitCost(),
                i.getStatus(), i.isLowStock(),
                i.getCreatedAt(), i.getUpdatedAt()
        );
    }
}
