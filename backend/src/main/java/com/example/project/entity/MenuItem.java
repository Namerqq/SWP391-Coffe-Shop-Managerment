package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "menu_items" (món, hoặc lựa chọn Size/Topping). */
@Entity
@Table(name = "menu_items")
public class MenuItem {

    public static final String AVAILABLE = "AVAILABLE";
    public static final String UNAVAILABLE = "UNAVAILABLE";
    public static final String INACTIVE = "INACTIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menu_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "item_name", nullable = false, length = 120)
    private String name;

    @Column(length = 1000)
    private String description;

    /** Giá gốc (VND). Với lựa chọn Size/Topping: số tiền cộng thêm. */
    @Column(name = "base_price", nullable = false)
    private Long basePrice;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "availability_status", nullable = false, length = 20)
    private String availabilityStatus = AVAILABLE;

    @Column(name = "recipe_ingredients", columnDefinition = "TEXT")
    private String recipeIngredients;

    @Column(name = "recipe_instructions", columnDefinition = "TEXT")
    private String recipeInstructions;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    /** Món đang bán: món AVAILABLE và danh mục đang ACTIVE. */
    public boolean isSellable() {
        return AVAILABLE.equals(availabilityStatus) && Category.ACTIVE.equals(category.getStatus());
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
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public String getRecipeIngredients() { return recipeIngredients; }
    public void setRecipeIngredients(String recipeIngredients) { this.recipeIngredients = recipeIngredients; }
    public String getRecipeInstructions() { return recipeInstructions; }
    public void setRecipeInstructions(String recipeInstructions) { this.recipeInstructions = recipeInstructions; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
