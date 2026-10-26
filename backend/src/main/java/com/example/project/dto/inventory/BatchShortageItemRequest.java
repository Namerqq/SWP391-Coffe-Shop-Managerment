package com.example.project.dto.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Một dòng nguyên liệu trong phiếu báo thiếu hàng loạt của Barista.
 */
public record BatchShortageItemRequest(
        @NotNull(message = "ID nguyên liệu không được để trống")
        Long inventoryItemId,

        @NotNull(message = "Số lượng yêu cầu không được để trống")
        @DecimalMin(value = "0.001", message = "Số lượng yêu cầu phải lớn hơn 0")
        BigDecimal requestedQuantity,

        String itemPriority, // "URGENT", "NORMAL"
        String note
) {
    public BatchShortageItemRequest(Long inventoryItemId, BigDecimal requestedQuantity, String itemPriority) {
        this(inventoryItemId, requestedQuantity, itemPriority, null);
    }

    public BatchShortageItemRequest(Long inventoryItemId, BigDecimal requestedQuantity) {
        this(inventoryItemId, requestedQuantity, "NORMAL", null);
    }
}
