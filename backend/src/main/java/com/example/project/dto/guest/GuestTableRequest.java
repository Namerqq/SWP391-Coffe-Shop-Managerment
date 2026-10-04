package com.example.project.dto.guest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Mã QR dán trên bàn (cột cafe_tables.qr_code, ví dụ TABLE-01). */
public record GuestTableRequest(
        @NotBlank(message = "Thiếu mã QR bàn") @Size(max = 255, message = "Mã QR không hợp lệ") String qrCode
) {}
