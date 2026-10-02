package com.example.project.entity;

import com.example.project.entity.enums.TableStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Bảng "cafe_tables" (V1__schema.sql). Mỗi bàn có 1 qr_code duy nhất để khách quét và tự gọi món. */
@Entity
@Table(name = "cafe_tables")
public class CafeTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "table_id")
    private Long id;

    @Column(name = "table_number", nullable = false, length = 30)
    private String tableNumber;

    @Column(name = "qr_code", nullable = false, length = 255)
    private String qrCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TableStatus status = TableStatus.AVAILABLE;

    /** Bàn bị tạm ngưng (is_active = false) thì không nhận đơn mới. */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTableNumber() { return tableNumber; }
    public String getQrCode() { return qrCode; }
    public TableStatus getStatus() { return status; }
    public void setStatus(TableStatus status) { this.status = status; }
    public boolean isActive() { return active; }
}
