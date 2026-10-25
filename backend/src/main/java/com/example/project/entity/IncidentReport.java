package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Biên bản sự cố làm đổ / vỡ món của phục vụ (incident_reports).
 * action: REMAKE (khách muốn làm lại) hoặc CANCEL (khách không muốn làm lại, hủy món).
 * status: PENDING (chờ quản lý xem xét) -> REVIEWED (quản lý đã quyết định mức phạt).
 * Thông tin nội bộ, không hiện cho khách.
 */
@Entity
@Table(name = "incident_reports")
public class IncidentReport {

    public static final String REMAKE = "REMAKE";
    public static final String CANCEL = "CANCEL";

    public static final String PENDING = "PENDING";
    public static final String REVIEWED = "REVIEWED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "incident_report_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_by_user_id", nullable = false)
    private User reportedBy;

    @Column(name = "action", nullable = false, length = 20)
    private String action;

    @Column(name = "reason", nullable = false, length = 300)
    private String reason;

    @Column(name = "status", nullable = false, length = 20)
    private String status = PENDING;

    @Column(name = "penalty_amount")
    private Long penaltyAmount;

    @Column(name = "manager_note", length = 300)
    private String managerNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_user_id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public OrderItem getOrderItem() { return orderItem; }
    public void setOrderItem(OrderItem orderItem) { this.orderItem = orderItem; }

    public User getReportedBy() { return reportedBy; }
    public void setReportedBy(User reportedBy) { this.reportedBy = reportedBy; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getPenaltyAmount() { return penaltyAmount; }
    public void setPenaltyAmount(Long penaltyAmount) { this.penaltyAmount = penaltyAmount; }

    public String getManagerNote() { return managerNote; }
    public void setManagerNote(String managerNote) { this.managerNote = managerNote; }

    public User getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(User reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
