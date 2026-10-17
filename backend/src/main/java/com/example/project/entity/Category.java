package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "categories" (danh mục món). */
@Entity
@Table(name = "categories")
public class Category {

    public static final String ACTIVE = "ACTIVE";
    public static final String INACTIVE = "INACTIVE";
    /** Tên mặc định của danh mục lựa chọn; category_type quyết định loại, độc lập với tên. */
    public static final String SIZE = "Size";
    public static final String TOPPING = "Topping";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long id;

    @Column(name = "category_name", nullable = false, length = 80)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "category_type", nullable = false, length = 20)
    private String categoryType = "DRINK";

    public String getCategoryType() { return categoryType; }
    public void setCategoryType(String type) { this.categoryType = type; }
    public boolean isType(String type) { return type.equals(categoryType); }

    @Column(nullable = false, length = 20)
    private String status = ACTIVE;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }

    /** true nếu category_type là SIZE hoặc TOPPING. */
    public boolean isOptionGroup() {
        return isType("SIZE") || isType("TOPPING");
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
