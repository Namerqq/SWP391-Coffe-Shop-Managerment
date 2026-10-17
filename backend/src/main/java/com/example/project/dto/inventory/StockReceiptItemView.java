package com.example.project.dto.inventory;

import com.example.project.entity.StockReceiptItem;
import java.math.BigDecimal;

public record StockReceiptItemView(
        Long id,
        Long inventoryItemId,
        String itemName,
        String unit,
        BigDecimal quantity,
        Long unitCost,
        Long subtotal
) {
    public static StockReceiptItemView from(StockReceiptItem item) {
        return new StockReceiptItemView(
                item.getId(),
                item.getInventoryItem().getId(),
                item.getInventoryItem().getItemName(),
                item.getInventoryItem().getUnit(),
                item.getQuantity(),
                item.getUnitCost(),
                item.getSubtotal()
        );
    }
}
