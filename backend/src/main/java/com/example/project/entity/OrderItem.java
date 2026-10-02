package com.example.project.entity;

import com.example.project.entity.enums.OrderItemStatus;
import jakarta.persistence.*;

/**
 * Bảng "order_items" (V1__schema.sql): snapshot giá/size/topping tại thời điểm đặt.
 * DB có CHECK: subtotal = quantity * (unit_price + size_price + topping_price),
 * vì vậy unit_price chỉ là giá gốc của món, KHÔNG cộng tiền size/topping vào.
 * Cột topping_details (JSON) chưa dùng (UC-CU04 Customize Item - topping), để NULL.
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    /** 1 - 50 (CHECK chk_order_items_quantity). */
    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private Long unitPrice;

    /** Lưu dạng chữ, vd "50%". */
    @Column(name = "sugar_level", length = 30)
    private String sugarLevel;

    @Column(name = "ice_level", length = 30)
    private String iceLevel;

    @Column(name = "size_name", length = 50)
    private String sizeName;

    @Column(name = "size_price", nullable = false)
    private Long sizePrice = 0L;

    @Column(name = "topping_price", nullable = false)
    private Long toppingPrice = 0L;

    @Column(length = 300)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_status", nullable = false, length = 20)
    private OrderItemStatus itemStatus = OrderItemStatus.PENDING;

    @Column(nullable = false)
    private Long subtotal;

    /** Tính subtotal đúng công thức CHECK của DB. Gọi sau khi đã set quantity và các giá. */
    public void calculateSubtotal() {
        this.subtotal = quantity * (unitPrice + sizePrice + toppingPrice);
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public MenuItem getMenuItem() { return menuItem; }
    public void setMenuItem(MenuItem menuItem) { this.menuItem = menuItem; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Long getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Long unitPrice) { this.unitPrice = unitPrice; }
    public String getSugarLevel() { return sugarLevel; }
    public void setSugarLevel(String sugarLevel) { this.sugarLevel = sugarLevel; }
    public String getIceLevel() { return iceLevel; }
    public void setIceLevel(String iceLevel) { this.iceLevel = iceLevel; }
    public String getSizeName() { return sizeName; }
    public Long getSizePrice() { return sizePrice; }
    public Long getToppingPrice() { return toppingPrice; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public OrderItemStatus getItemStatus() { return itemStatus; }
    public Long getSubtotal() { return subtotal; }
}
