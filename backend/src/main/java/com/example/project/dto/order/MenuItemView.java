package com.example.project.dto.order;

public record MenuItemView(Long id, Long categoryId, String name, String description, long price, String imageUrl, String categoryType, com.example.project.dto.menu.ItemCustomization customization) {}
