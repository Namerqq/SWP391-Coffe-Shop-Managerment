package com.example.project.dto;

import jakarta.validation.constraints.*;

/** Cập nhật thông tin tài khoản. newPassword để trống = giữ mật khẩu cũ. */
public record UserUpdateRequest(
        @NotBlank(message = "Họ tên không được để trống") @Size(max = 100) String fullName,
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Pattern(regexp = "^[a-zA-Z0-9._]{3,50}$", message = "Tên đăng nhập 3-50 ký tự, chỉ gồm chữ, số, dấu . và _")
        String username,
        @NotBlank(message = "Email không được để trống") @Email(message = "Email không hợp lệ") @Size(max = 150) String email,
        @Size(max = 72) String newPassword
) {}
