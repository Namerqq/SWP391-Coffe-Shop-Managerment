package com.example.project.dto;

import com.example.project.entity.Product;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** DTO trả dữ liệu VỀ frontend (chỉ trả những gì cần thiết). */
public record ProductResponse(
        Long id, String name, BigDecimal price, Integer quantity,
        String description, LocalDateTime createdAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(p.getId(), p.getName(), p.getPrice(),
                p.getQuantity(), p.getDescription(), p.getCreatedAt());
    }
}
