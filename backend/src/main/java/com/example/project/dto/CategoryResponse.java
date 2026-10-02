package com.example.project.dto;

import com.example.project.entity.Category;
import com.example.project.entity.enums.CategoryStatus;
import java.time.LocalDateTime;

/** itemCount = số món đang dùng (không tính món INACTIVE) thuộc danh mục. */
public record CategoryResponse(
        Long id, String name, String description, CategoryStatus status, long itemCount, LocalDateTime createdAt
) {
    public static CategoryResponse from(Category c, long itemCount) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDescription(), c.getStatus(), itemCount, c.getCreatedAt());
    }
}
