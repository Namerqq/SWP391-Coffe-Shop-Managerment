package com.example.project.entity;

import com.example.project.entity.enums.SessionStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Bảng "table_sessions" (V1__schema.sql): 1 lượt khách ngồi tại 1 bàn, gom các đơn của lượt đó.
 * Cột active_table_id là cột GENERATED trong DB (đảm bảo mỗi bàn chỉ 1 session OPEN/PAYMENT_PENDING)
 * nên KHÔNG map ở đây. customer_id do màn Cashier gắn sau, chưa map.
 */
@Entity
@Table(name = "table_sessions")
public class TableSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "table_session_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "table_id", nullable = false)
    private CafeTable table;

    @Column(name = "session_code", nullable = false, length = 40)
    private String sessionCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionStatus status = SessionStatus.OPEN;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.openedAt == null) this.openedAt = this.createdAt;
    }

    public Long getId() { return id; }
    public CafeTable getTable() { return table; }
    public void setTable(CafeTable table) { this.table = table; }
    public String getSessionCode() { return sessionCode; }
    public void setSessionCode(String sessionCode) { this.sessionCode = sessionCode; }
    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }
    public LocalDateTime getOpenedAt() { return openedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
}
