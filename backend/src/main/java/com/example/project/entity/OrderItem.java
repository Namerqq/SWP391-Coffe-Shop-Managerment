package com.example.project.entity;

import jakarta.persistence.*;

/**
 * ENTITY = 1 dòng trong bảng "order_items": 1 món trong đơn, lưu "ảnh chụp" giá, size, topping lúc gọi.
 * Ràng buộc DB: subtotal = quantity * (unit_price + size_price + topping_price).
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    public static final String PENDING = "PENDING";
    public static final String PREPARING = "PREPARING";
    public static final String READY = "READY";
    public static final String SERVED = "SERVED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private Long unitPrice;

    @Column(name = "sugar_level", length = 30)
    private String sugarLevel;

    @Column(name = "ice_level", length = 30)
    private String iceLevel;

    @Column(name = "size_name", length = 50)
    private String sizeName;

    @Column(name = "size_price", nullable = false)
    private Long sizePrice = 0L;

    /** JSON: [{"id":12,"name":"Trân châu","price":5000}] */
    @Column(name = "topping_details", columnDefinition = "json")
    private String toppingDetails;

    /** Tổng tiền topping cho 1 ly. */
    @Column(name = "topping_price", nullable = false)
    private Long toppingPrice = 0L;

    @Column(length = 300)
    private String note;

    @Column(name = "item_status", nullable = false, length = 20)
    private String itemStatus = PENDING;

    @Column(nullable = false)
    private Long subtotal;

    public void recalcSubtotal() {
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
    public void setSizeName(String sizeName) { this.sizeName = sizeName; }
    public Long getSizePrice() { return sizePrice; }
    public void setSizePrice(Long sizePrice) { this.sizePrice = sizePrice; }
    public String getToppingDetails() { return toppingDetails; }
    public void setToppingDetails(String toppingDetails) { this.toppingDetails = toppingDetails; }
    public Long getToppingPrice() { return toppingPrice; }
    public void setToppingPrice(Long toppingPrice) { this.toppingPrice = toppingPrice; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getItemStatus() { return itemStatus; }
    public void setItemStatus(String itemStatus) { this.itemStatus = itemStatus; }
    public Long getSubtotal() { return subtotal; }
    public void setSubtotal(Long subtotal) { this.subtotal = subtotal; }
}
