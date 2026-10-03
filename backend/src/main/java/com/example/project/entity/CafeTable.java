package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "cafe_tables" (bàn trong quán). */
@Entity
@Table(name = "cafe_tables")
public class CafeTable {

    public static final String AVAILABLE = "AVAILABLE";
    public static final String OCCUPIED = "OCCUPIED";
    public static final String UNAVAILABLE = "UNAVAILABLE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "table_id")
    private Long id;

    @Column(name = "table_number", nullable = false, length = 30)
    private String tableNumber;

    @Column(name = "qr_code", nullable = false, length = 255)
    private String qrCode;

    @Column(nullable = false, length = 20)
    private String status = AVAILABLE;

    /** false = bàn tạm ngưng (ẩn khỏi sơ đồ bàn, không nhận đơn). */
    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getTableNumber() { return tableNumber; }
    public void setTableNumber(String tableNumber) { this.tableNumber = tableNumber; }
    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
