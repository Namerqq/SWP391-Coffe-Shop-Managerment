package com.example.project.dto.cashier;

import jakarta.validation.constraints.Min;

import java.util.List;

/**
 * Tạo mã QR payOS cho các đơn tại bàn. Giống PayRequest nhưng không có method (luôn là QR).
 * orderIds bỏ trống = mọi đơn chưa thanh toán của bàn. expectedSubtotal = tạm tính thu ngân đang thấy (lệch -> 409).
 */
public record QrSessionRequest(
        Long customerId,
        @Min(value = 0, message = "Số điểm dùng không hợp lệ") Integer pointsToRedeem,
        List<Long> orderIds,
        @Min(value = 0, message = "Số tiền không hợp lệ") Long expectedSubtotal
) {}
