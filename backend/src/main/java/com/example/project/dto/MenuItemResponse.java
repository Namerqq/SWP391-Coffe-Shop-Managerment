package com.example.project.dto;

import com.example.project.entity.MenuItem;
import com.example.project.entity.enums.MenuItemStatus;
import java.time.LocalDateTime;

/** orderable = khách có đặt được không (món AVAILABLE + danh mục ACTIVE). */
public record MenuItemResponse(
        Long id, Long categoryId, String categoryName,
        String name, String description, Long basePrice, String imageUrl,
        MenuItemStatus availabilityStatus, boolean orderable,
        LocalDateTime createdAt, LocalDateTime updatedAt
) {
    public static MenuItemResponse from(MenuItem m) {
        return new MenuItemResponse(
                m.getId(), m.getCategory().getId(), m.getCategory().getName(),
                m.getName(), m.getDescription(), m.getBasePrice(), m.getImageUrl(),
                m.getAvailabilityStatus(), m.isOrderable(),
                m.getCreatedAt(), m.getUpdatedAt());
    }
}
