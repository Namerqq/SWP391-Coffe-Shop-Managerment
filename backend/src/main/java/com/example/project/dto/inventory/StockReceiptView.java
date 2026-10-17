package com.example.project.dto.inventory;

import com.example.project.entity.StockReceipt;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record StockReceiptView(
        Long id,
        String receiptCode,
        String supplierName,
        String status,
        LocalDate receiptDate,
        Long totalAmount,
        String note,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime confirmedAt,
        List<StockReceiptItemView> items
) {
    public static StockReceiptView from(StockReceipt r) {
        List<StockReceiptItemView> itemViews = r.getItems() != null
                ? r.getItems().stream().map(StockReceiptItemView::from).toList()
                : List.of();

        return new StockReceiptView(
                r.getId(),
                r.getReceiptCode(),
                r.getSupplierName(),
                r.getStatus(),
                r.getReceiptDate(),
                r.getTotalAmount(),
                r.getNote(),
                r.getCreatedBy() != null ? r.getCreatedBy().getFullName() : "Hệ thống",
                r.getCreatedAt(),
                r.getConfirmedAt(),
                itemViews
        );
    }
}
