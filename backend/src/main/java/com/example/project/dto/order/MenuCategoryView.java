package com.example.project.dto.order;

import java.util.List;

public record MenuCategoryView(Long id, String name, String description, List<MenuItemView> items) {}
