package com.example.project.dto.onlinepay;

import java.time.LocalDateTime;

/**
 * Mã QR cho trang của khách đặt online (chỉ những gì khách cần xem, không có thông tin thu ngân / ghi chú nội bộ).
 * status: PENDING (chờ quét) | PAID (đã tạo đơn) | EXPIRED | CANCELLED | MISMATCH (tiền đã về nhưng chưa tạo được đơn,
 * quán sẽ xử lý tay). secondsLeft tính trên đồng hồ server. Khi PAID: orderNumber = mã đơn vừa tạo (dạng hiển thị).
 */
public record OnlineQrView(
        String paymentLinkId, String status,
        long subtotal, long discount, long amount, int pointsToRedeem,
        String qrCode, String checkoutUrl, String description,
        LocalDateTime expiresAt, long secondsLeft, int itemCount,
        String customerPhone, String orderNumber, LocalDateTime paidAt
) {}
