package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "loyalty_transactions" (lịch sử cộng / trừ điểm, không sửa / xóa). */
@Entity
@Table(name = "loyalty_transactions")
public class LoyaltyTransaction {

    public static final String EARN = "EARN";
    public static final String REDEEM = "REDEEM";
    public static final String ADJUSTMENT = "ADJUSTMENT";
    public static final String REFUND = "REFUND";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "loyalty_transaction_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_session_id")
    private TableSession tableSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    /** Dương = cộng điểm, âm = dùng điểm. Không được bằng 0. */
    @Column(name = "points_change", nullable = false)
    private Integer pointsChange;

    @Column(name = "transaction_type", nullable = false, length = 20)
    private String transactionType;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }

    public static LoyaltyTransaction of(Customer customer, Payment payment, TableSession session,
                                        int pointsChange, String type, String note) {
        LoyaltyTransaction t = new LoyaltyTransaction();
        t.customer = customer;
        t.payment = payment;
        t.tableSession = session;
        t.pointsChange = pointsChange;
        t.transactionType = type;
        t.note = note;
        return t;
    }

    public Long getId() { return id; }
    public TableSession getTableSession() { return tableSession; }
    public Payment getPayment() { return payment; }
    public Customer getCustomer() { return customer; }
    public Integer getPointsChange() { return pointsChange; }
    public String getTransactionType() { return transactionType; }
    public String getNote() { return note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
