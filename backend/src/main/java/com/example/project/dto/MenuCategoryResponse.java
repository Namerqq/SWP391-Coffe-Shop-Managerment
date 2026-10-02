package com.example.project.dto;

import java.util.List;

/** 1 nhóm (tab) trên menu của khách: danh mục + các món bên trong. */
public record MenuCategoryResponse(Long id, String name, String description, List<MenuItemResponse> items) {}
