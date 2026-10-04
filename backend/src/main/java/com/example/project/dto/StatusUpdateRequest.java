package com.example.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** ACTIVE = kích hoạt / mở khóa, INACTIVE = vô hiệu hóa. LOCKED chỉ do hệ thống đặt khi đăng nhập sai nhiều lần. */
public record StatusUpdateRequest(
        @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE", message = "Trạng thái chỉ được là ACTIVE hoặc INACTIVE") String status
) {}
