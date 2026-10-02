package com.example.project.dto;

import com.example.project.entity.enums.CategoryStatus;
import jakarta.validation.constraints.*;

/** Dữ liệu thêm/sửa danh mục. status bỏ trống => ACTIVE. */
public record CategoryRequest(
        @NotBlank(message = "Tên danh mục không được để trống") @Size(max = 80, message = "Tên tối đa 80 ký tự") String name,
        @Size(max = 500, message = "Mô tả tối đa 500 ký tự") String description,
        CategoryStatus status
) {}
