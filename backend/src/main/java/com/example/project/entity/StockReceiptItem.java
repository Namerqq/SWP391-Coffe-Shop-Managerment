package com.example.project.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Chi tiết nguyên liệu trong phiếu nhập kho (stock_receipt_items).
 */
@Entity
@Table(name = "stock_receipt_items")
public class StockReceiptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_receipt_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_receipt_id", nullable = false)
    private StockReceipt receipt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem inventoryItem;

    @Column(name = "quantity", nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_cost", nullable = false)
    private Long unitCost = 0L;

    @Column(name = "subtotal", nullable = false)
    private Long subtotal = 0L;

    public void calcSubtotal() {
        if (quantity != null && unitCost != null) {
            BigDecimal cost = BigDecimal.valueOf(unitCost);
            this.subtotal = quantity.multiply(cost).setScale(0, RoundingMode.HALF_UP).longValue();
        } else {
            this.subtotal = 0L;
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public StockReceipt getReceipt() { return receipt; }
    public void setReceipt(StockReceipt receipt) { this.receipt = receipt; }

    public InventoryItem getInventoryItem() { return inventoryItem; }
    public void setInventoryItem(InventoryItem inventoryItem) { this.inventoryItem = inventoryItem; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
        calcSubtotal();
    }

    public Long getUnitCost() { return unitCost; }
    public void setUnitCost(Long unitCost) {
        this.unitCost = unitCost;
        calcSubtotal();
    }

    public Long getSubtotal() { return subtotal; }
    public void setSubtotal(Long subtotal) { this.subtotal = subtotal; }
}
