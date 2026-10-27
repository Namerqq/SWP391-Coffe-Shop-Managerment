package com.example.project.dto.cashier;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** UC-C12: sửa tên / số điện thoại khách thân thiết. Điểm không sửa ở đây. */
public record CustomerUpdateRequest(
        @NotBlank(message = "Vui lòng nhập số điện thoại") String phoneNumber,
        @Size(max = 100, message = "Tên tối đa 100 ký tự") String fullName
) {}
