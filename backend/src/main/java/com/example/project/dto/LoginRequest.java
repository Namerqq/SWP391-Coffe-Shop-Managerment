package com.example.project.dto;

import jakarta.validation.constraints.NotBlank;

/** Đăng nhập bằng username HOẶC email. */
public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập hoặc email") String identifier,
        @NotBlank(message = "Vui lòng nhập mật khẩu") String password
) {}
