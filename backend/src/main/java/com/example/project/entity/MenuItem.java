package com.example.project.entity;

import com.example.project.entity.enums.CategoryStatus;
import com.example.project.entity.enums.MenuItemStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Bảng "menu_items" (V1__schema.sql). Mỗi món thuộc đúng 1 Category.
 * Không xóa cứng: "xóa" = chuyển availability_status sang INACTIVE để giữ lịch sử đơn hàng.
 * Cột recipe_ingredients / recipe_instructions (màn Recipe của Barista) chưa map ở đây.
 */
@Entity
@Table(name = "menu_items")
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menu_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "item_name", nullable = false, length = 120)
    private String name;

    @Column(length = 1000)
    private String description;

    /** Giá theo VND, lưu BIGINT (không dùng số thập phân). */
    @Column(name = "base_price", nullable = false)
    private Long basePrice;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status", nullable = false, length = 20)
    private MenuItemStatus availabilityStatus = MenuItemStatus.AVAILABLE;

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

    /** Khách chỉ đặt được món đang AVAILABLE thuộc danh mục ACTIVE. */
    public boolean isOrderable() {
        return availabilityStatus == MenuItemStatus.AVAILABLE
                && category.getStatus() == CategoryStatus.ACTIVE;
    }

    public Long getId() { return id; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getBasePrice() { return basePrice; }
    public void setBasePrice(Long basePrice) { this.basePrice = basePrice; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public MenuItemStatus getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(MenuItemStatus availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
