package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * ENTITY = 1 dòng trong bảng "table_sessions": 1 lượt khách ngồi ở 1 bàn, gom mọi đơn của lượt đó.
 * Cột active_table_id là cột sinh tự động trong DB nên KHÔNG map.
 */
@Entity
@Table(name = "table_sessions")
public class TableSession {

    public static final String OPEN = "OPEN";
    public static final String PAYMENT_PENDING = "PAYMENT_PENDING";
    public static final String CLOSED = "CLOSED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "table_session_id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "table_id", nullable = false)
    private CafeTable table;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "session_code", nullable = false, length = 40)
    private String sessionCode;

    @Column(nullable = false, length = 20)
    private String status = OPEN;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.openedAt == null) this.openedAt = this.createdAt;
    }

    /** Phiên còn mở (khách còn ngồi, chưa thanh toán xong). */
    public boolean isActive() {
        return OPEN.equals(status) || PAYMENT_PENDING.equals(status);
    }

    public Long getId() { return id; }
    public CafeTable getTable() { return table; }
    public void setTable(CafeTable table) { this.table = table; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public String getSessionCode() { return sessionCode; }
    public void setSessionCode(String sessionCode) { this.sessionCode = sessionCode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getOpenedAt() { return openedAt; }
    public void setOpenedAt(LocalDateTime openedAt) { this.openedAt = openedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
