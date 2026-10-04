package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "categories" (danh mục món). */
@Entity
@Table(name = "categories")
public class Category {

    public static final String ACTIVE = "ACTIVE";
    public static final String INACTIVE = "INACTIVE";
    /** 2 danh mục đặc biệt: "món" bên trong là lựa chọn Size / Topping, không bán riêng. */
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

    @Column(nullable = false, length = 20)
    private String status = ACTIVE;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }

    /** true nếu là danh mục Size hoặc Topping. */
    public boolean isOptionGroup() {
        return SIZE.equalsIgnoreCase(name) || TOPPING.equalsIgnoreCase(name);
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
