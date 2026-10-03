package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "payments". Gắn với ĐÚNG 1 trong 2: phiên bàn (tại quán) hoặc 1 đơn (mang đi/online). */
@Entity
@Table(name = "payments")
public class Payment {

    public static final String PENDING = "PENDING";
    public static final String PAID = "PAID";
    public static final String REFUND_PENDING = "REFUND_PENDING";
    public static final String REFUNDED = "REFUNDED";
    public static final String CANCELLED = "CANCELLED";

    public static final String CASH = "CASH";
    public static final String BANK_TRANSFER = "BANK_TRANSFER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by_user_id")
    private User confirmedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_session_id")
    private TableSession tableSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "payment_code", nullable = false, length = 40)
    private String paymentCode;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod;

    /** Số tiền thực thu (đã trừ giảm giá bằng điểm). */
    @Column(name = "total_amount", nullable = false)
    private Long totalAmount;

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = PENDING;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public User getConfirmedBy() { return confirmedBy; }
    public void setConfirmedBy(User confirmedBy) { this.confirmedBy = confirmedBy; }
    public TableSession getTableSession() { return tableSession; }
    public void setTableSession(TableSession tableSession) { this.tableSession = tableSession; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public Long getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Long totalAmount) { this.totalAmount = totalAmount; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
