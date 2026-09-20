package com.example.project.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** DTO nhận dữ liệu TỪ frontend gửi lên (có kiểm tra hợp lệ). */
public record ProductRequest(
        @NotBlank(message = "Tên không được để trống") @Size(max = 150) String name,
        @NotNull(message = "Giá không được để trống") @DecimalMin(value = "0.0", message = "Giá phải >= 0") BigDecimal price,
        @NotNull(message = "Số lượng không được để trống") @Min(value = 0, message = "Số lượng phải >= 0") Integer quantity,
        @Size(max = 500) String description
) {}
