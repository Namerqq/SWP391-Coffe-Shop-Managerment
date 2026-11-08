package com.example.project.dto.online;

/** Món đang "Tạm hết" để menu online hiện xám (khách biết quán có món nhưng hiện chưa bán). */
public record SoldOutItemView(Long id, Long categoryId, String categoryName, String name,
                              String description, long price, String imageUrl) {}
