package com.example.project.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "inventory_items" (nguyên liệu / vật tư kho). */
@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    public static final String ACTIVE = "ACTIVE";
    public static final String INACTIVE = "INACTIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inventory_item_id")
    private Long id;

    @Column(name = "item_name", nullable = false, length = 120, unique = true)
    private String itemName;

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(name = "current_quantity", nullable = false, precision = 14, scale = 3)
    private BigDecimal currentQuantity = BigDecimal.ZERO;

    @Column(name = "minimum_stock_level", nullable = false, precision = 14, scale = 3)
    private BigDecimal minimumStockLevel = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String status = ACTIVE;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "unit_cost", nullable = false)
    private Long unitCost = 0L;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getCurrentQuantity() { return currentQuantity; }
    public void setCurrentQuantity(BigDecimal currentQuantity) { this.currentQuantity = currentQuantity; }
    public BigDecimal getMinimumStockLevel() { return minimumStockLevel; }
    public void setMinimumStockLevel(BigDecimal minimumStockLevel) { this.minimumStockLevel = minimumStockLevel; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getUnitCost() { return unitCost; }
    public void setUnitCost(Long unitCost) { this.unitCost = unitCost; }

    /** Kiểm tra nguyên liệu có đang ở mức thấp (sắp hết) hay không. */
    public boolean isLowStock() {
        return currentQuantity.compareTo(minimumStockLevel) <= 0;
    }
}
