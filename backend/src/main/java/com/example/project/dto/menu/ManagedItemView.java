package com.example.project.dto.menu;
public record ManagedItemView(Long id, Long categoryId, String name, String description,
 Long basePrice, String imageUrl, String availabilityStatus, boolean sellStandalone, java.util.List<Long> allowedItemIds) {}
