package com.example.project.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "stock_transactions" (lịch sử nhập/xuất kho). */
@Entity
@Table(name = "stock_transactions")
public class StockTransaction {

    public static final String INITIAL = "INITIAL";
    public static final String STOCK_IN = "STOCK_IN";
    public static final String STOCK_OUT = "STOCK_OUT";
    public static final String WASTE = "WASTE";
    public static final String ADJUSTMENT = "ADJUSTMENT";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_transaction_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem inventoryItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "transaction_type", nullable = false, length = 20)
    private String transactionType;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Column(length = 255)
    private String reason;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public InventoryItem getInventoryItem() { return inventoryItem; }
    public void setInventoryItem(InventoryItem inventoryItem) { this.inventoryItem = inventoryItem; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
