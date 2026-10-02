package com.example.project.dto;

import com.example.project.entity.enums.MenuItemStatus;
import jakarta.validation.constraints.*;

/** Dữ liệu thêm/sửa món. Giá là số nguyên VND. */
public record MenuItemRequest(
        @NotNull(message = "Vui lòng chọn danh mục") Long categoryId,
        @NotBlank(message = "Tên món không được để trống") @Size(max = 120, message = "Tên món tối đa 120 ký tự") String name,
        @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự") String description,
        @NotNull(message = "Giá không được để trống") @Min(value = 0, message = "Giá phải >= 0") Long basePrice,
        @Size(max = 500, message = "Link ảnh tối đa 500 ký tự") String imageUrl,
        MenuItemStatus availabilityStatus
) {}
