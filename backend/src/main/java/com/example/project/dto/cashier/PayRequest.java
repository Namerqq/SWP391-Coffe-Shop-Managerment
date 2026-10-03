package com.example.project.dto.cashier;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Thanh toán: method = CASH | BANK_TRANSFER. customerId, pointsToRedeem không bắt buộc. */
public record PayRequest(
        @NotBlank(message = "Vui lòng chọn cách thanh toán")
        @Pattern(regexp = "CASH|BANK_TRANSFER", message = "Cách thanh toán chỉ là Tiền mặt hoặc Chuyển khoản")
        String method,
        Long customerId,
        @Min(value = 0, message = "Số điểm dùng không hợp lệ") Integer pointsToRedeem
) {}
