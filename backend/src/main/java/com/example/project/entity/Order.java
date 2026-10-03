package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ENTITY = 1 dòng trong bảng "orders".
 * Giữ nguyên trạng thái của schema V1, đối chiếu với tên trong SRS:
 *   PENDING_CONFIRMATION = Chờ pha (SRS: PENDING) | PREPARING = Đang pha | READY = Chờ mang ra
 *   COMPLETED = Đã phục vụ (SRS: SERVED) | CANCELLED = Đã hủy
 *   "Đã thanh toán" (SRS: PAID) = có payment PAID + phiên bàn CLOSED (bảng orders không có PAID).
 *   CONFIRMED để dành cho đơn online đã trả QR (Iter2).
 */
@Entity
@Table(name = "orders")
public class Order {

    public static final String PENDING = "PENDING_CONFIRMATION";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String PREPARING = "PREPARING";
    public static final String READY = "READY";
    public static final String SERVED = "COMPLETED";
    public static final String CANCELLED = "CANCELLED";
    public static final String REJECTED = "REJECTED";

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
