package com.example.project.dto.cashier;

import jakarta.validation.constraints.Size;

/**
 * UC-C12: sửa tên khách thân thiết. Số điện thoại và điểm không sửa ở đây
 * (SĐT là định danh để tích / dùng điểm, thu ngân không được đổi).
 */
public record CustomerUpdateRequest(
        @Size(max = 100, message = "Tên tối đa 100 ký tự") String fullName
) {}
