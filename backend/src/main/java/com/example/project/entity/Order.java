package com.example.project.entity;

import com.example.project.entity.enums.FulfillmentType;
import com.example.project.entity.enums.OrderSource;
import com.example.project.entity.enums.OrderStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Bảng "orders" (V1__schema.sql). Bảng tên "orders" vì ORDER là từ khóa SQL.
 * Chỉ map các cột màn Customer Menu cần; các cột khác (created_by_user_id, customer_id, customer_name,
 * pickup_time, accepted_*, cancel_*, completed_at) để NULL theo mặc định, màn khác sẽ map thêm.
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long id;

    @Column(name = "order_number", nullable = false, length = 40)
    private String orderNumber;

    /** DINE_IN bắt buộc có session (CHECK chk_orders_session_by_fulfillment). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_session_id")
    private TableSession tableSession;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_source", nullable = false, length = 20)
    private OrderSource orderSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_type", nullable = false, length = 20)
    private FulfillmentType fulfillmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status = OrderStatus.PENDING_CONFIRMATION;

    @Column(name = "customer_note", length = 500)
    private String customerNote;

    /** Tổng tiền VND = tổng subtotal các dòng món. */
    @Column(name = "total_amount", nullable = false)
    private Long totalAmount = 0L;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

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

    /** Thêm dòng món và cộng dồn total_amount. */
    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
        totalAmount += item.getSubtotal();
    }

    public Long getId() { return id; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public TableSession getTableSession() { return tableSession; }
    public void setTableSession(TableSession tableSession) { this.tableSession = tableSession; }
    public OrderSource getOrderSource() { return orderSource; }
    public void setOrderSource(OrderSource orderSource) { this.orderSource = orderSource; }
    public FulfillmentType getFulfillmentType() { return fulfillmentType; }
    public void setFulfillmentType(FulfillmentType fulfillmentType) { this.fulfillmentType = fulfillmentType; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getCustomerNote() { return customerNote; }
    public void setCustomerNote(String customerNote) { this.customerNote = customerNote; }
    public Long getTotalAmount() { return totalAmount; }
    public List<OrderItem> getItems() { return items; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
