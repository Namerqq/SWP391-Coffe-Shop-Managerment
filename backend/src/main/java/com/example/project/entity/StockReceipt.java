package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Phiếu nhập kho (stock_receipts).
 * status: DRAFT (nháp / yêu cầu bổ sung), RECEIVED (đã nhập kho), CANCELLED (hủy).
 */
@Entity
@Table(name = "stock_receipts")
public class StockReceipt {

    public static final String DRAFT = "DRAFT";
    public static final String RECEIVED = "RECEIVED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_receipt_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "receipt_code", nullable = false, length = 40, unique = true)
    private String receiptCode;

    @Column(name = "supplier_name", nullable = false, length = 150)
    private String supplierName;

    @Column(name = "status", nullable = false, length = 20)
    private String status = DRAFT;

    @Column(name = "receipt_date", nullable = false)
    private LocalDate receiptDate;

    @Column(name = "total_amount", nullable = false)
    private Long totalAmount = 0L;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StockReceiptItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (receiptDate == null) {
            receiptDate = LocalDate.now();
        }
    }

    public void addItem(StockReceiptItem item) {
        item.setReceipt(this);
        this.items.add(item);
    }

    public void removeItem(StockReceiptItem item) {
        this.items.remove(item);
        item.setReceipt(null);
    }

    public void clearItems() {
        for (StockReceiptItem item : this.items) {
            item.setReceipt(null);
        }
        this.items.clear();
    }

    public void recalcTotal() {
        long total = 0L;
        for (StockReceiptItem item : this.items) {
            if (item.getSubtotal() != null) {
                total += item.getSubtotal();
            }
        }
        this.totalAmount = total;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public String getReceiptCode() { return receiptCode; }
    public void setReceiptCode(String receiptCode) { this.receiptCode = receiptCode; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getReceiptDate() { return receiptDate; }
    public void setReceiptDate(LocalDate receiptDate) { this.receiptDate = receiptDate; }

    public Long getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Long totalAmount) { this.totalAmount = totalAmount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    public List<StockReceiptItem> getItems() { return items; }
    public void setItems(List<StockReceiptItem> items) { this.items = items; }
}
