package com.example.project.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ENTITY = 1 dòng trong bảng "orders". Từ V6 mỗi đơn có 2 trạng thái CHẠY SONG SONG:
 *
 * 1) status = tiến trình phục vụ, giữ tên của schema V1, đối chiếu với tên trong SRS:
 *   PENDING_CONFIRMATION = Chờ pha (SRS: PENDING) | PREPARING = Đang pha | READY = Chờ mang ra
 *   COMPLETED = Đã phục vụ (SRS: SERVED) | CANCELLED = Đã hủy
 *   CONFIRMED để dành cho đơn online đã trả QR (Iter2).
 *
 * 2) paymentStatus = đã thanh toán chưa: UNPAID | PAID (SRS: PAID).
 *   Thu ngân thu tiền được đơn ở bất kỳ trạng thái phục vụ nào (trừ đơn đã hủy).
 *   payment = hóa đơn đã thu đơn này (1 hóa đơn có thể gồm nhiều đơn của cùng 1 bàn).
 *
 * Bàn trả về trống khi mọi đơn chưa hủy vừa đã phục vụ vừa đã thanh toán (isSettled).
 * Dùng {@code @DynamicUpdate}: lệnh UPDATE chỉ ghi các cột có thay đổi, để Pha chế đổi trạng thái
 * và Thu ngân ghi thanh toán cùng lúc trên 1 đơn không ghi đè lên nhau.
 */
@Entity
@Table(name = "orders")
@DynamicUpdate
public class Order {

    public static final String PENDING = "PENDING_CONFIRMATION";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String PREPARING = "PREPARING";
    public static final String READY = "READY";
    public static final String SERVED = "COMPLETED";
    public static final String CANCELLED = "CANCELLED";
    public static final String REJECTED = "REJECTED";

    public static final String UNPAID = "UNPAID";
    public static final String PAID = "PAID";

    public static final String SOURCE_QR = "QR_TABLE";
    public static final String SOURCE_STAFF = "STAFF";
    public static final String SOURCE_ONLINE = "ONLINE";

    public static final String DINE_IN = "DINE_IN";
    public static final String PICKUP = "PICKUP";
    public static final String DELIVERY = "DELIVERY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_session_id")
    private TableSession tableSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "order_number", nullable = false, length = 40)
    private String orderNumber;

    @Column(name = "order_source", nullable = false, length = 20)
    private String source;

    @Column(nullable = false, length = 30)
    private String status = PENDING;

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = UNPAID;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Column(name = "fulfillment_type", nullable = false, length = 20)
    private String fulfillmentType;

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "pickup_time")
    private LocalDateTime pickupTime;

    @Column(name = "customer_note", length = 500)
    private String customerNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by_user_id")
    private User acceptedBy;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "total_amount", nullable = false)
    private Long totalAmount = 0L;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }

    /** Đơn đang chờ pha (chưa bắt đầu pha). */
    public boolean isWaitingForPreparation() {
        return PENDING.equals(status) || CONFIRMED.equals(status);
    }

    /** Đơn đã hủy / bị từ chối: không tính tiền, không cần phục vụ. */
    public boolean isCancelled() {
        return CANCELLED.equals(status) || REJECTED.equals(status);
    }

    /** Đã mang món ra cho khách (SRS: SERVED). */
    public boolean isServed() { return SERVED.equals(status); }

    /** Đã thanh toán (SRS: PAID). */
    public boolean isPaid() { return PAID.equals(paymentStatus); }

    /** Xong cả 2 phía: đã phục vụ VÀ đã thanh toán. */
    public boolean isSettled() { return isServed() && isPaid(); }

    /** Ghi nhận đơn đã được thu tiền trong hóa đơn p (p đã lưu và đã có giờ thu). */
    public void markPaid(Payment p) {
        this.paymentStatus = PAID;
        this.paidAt = p.getPaidAt();
        this.payment = p;
    }

    /** Đổi trạng thái đơn, đồng thời đổi trạng thái các món chưa bị hủy. */
    public void moveTo(String orderStatus, String itemStatus) {
        this.status = orderStatus;
        for (OrderItem i : items) {
            if (!OrderItem.CANCELLED.equals(i.getItemStatus())) i.setItemStatus(itemStatus);
        }
    }

    /** Tổng tiền các món chưa hủy (tính từ món, không phụ thuộc cột total_amount). */
    public long activeTotal() {
        return items.stream()
                .filter(i -> !OrderItem.CANCELLED.equals(i.getItemStatus()))
                .mapToLong(i -> i.getSubtotal() == null ? 0 : i.getSubtotal())
                .sum();
    }

    public void recalcTotal() { this.totalAmount = activeTotal(); }

    public Long getId() { return id; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public TableSession getTableSession() { return tableSession; }
    public void setTableSession(TableSession tableSession) { this.tableSession = tableSession; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }
    public String getFulfillmentType() { return fulfillmentType; }
    public void setFulfillmentType(String fulfillmentType) { this.fulfillmentType = fulfillmentType; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public LocalDateTime getPickupTime() { return pickupTime; }
    public void setPickupTime(LocalDateTime pickupTime) { this.pickupTime = pickupTime; }
    public String getCustomerNote() { return customerNote; }
    public void setCustomerNote(String customerNote) { this.customerNote = customerNote; }
    public User getAcceptedBy() { return acceptedBy; }
    public void setAcceptedBy(User acceptedBy) { this.acceptedBy = acceptedBy; }
    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }
    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }
    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(LocalDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public Long getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Long totalAmount) { this.totalAmount = totalAmount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<OrderItem> getItems() { return items; }
}
