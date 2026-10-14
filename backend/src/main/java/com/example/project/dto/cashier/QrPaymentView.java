package com.example.project.dto.cashier;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 1 mã QR payOS cho màn thu ngân.
 * status: PENDING | PAID | EXPIRED | CANCELLED | MISMATCH. target: TABLE | TAKEAWAY.
 * secondsLeft = số giây còn lại tính trên đồng hồ server (frontend đếm ngược từ đây, không phụ thuộc giờ máy khách).
 * discount = giảm giá bằng điểm. qrCode = chuỗi VietQR để vẽ mã. description = nội dung chuyển khoản.
 * Khi PAID: paymentId / paymentCode = hóa đơn vừa tạo; takeawayOrderNumber = đơn mang đi vừa tạo;
 * tableReleased = bàn đã trả về trống. note = lý do khi EXPIRED / CANCELLED / MISMATCH.
 */
public record QrPaymentView(
        Long id, String status, String target, long orderCode,
        long subtotal, long discount, long amount, int pointsToRedeem,
        String qrCode, String checkoutUrl, String description,
        LocalDateTime createdAt, LocalDateTime expiresAt, long secondsLeft,
        Long sessionId, Long tableId, String tableNumber, List<Long> orderIds, String orderNumbers, int itemCount,
        String customerName, String createdByName,
        LocalDateTime paidAt, Long paymentId, String paymentCode, String takeawayOrderNumber, boolean tableReleased,
        String note, LocalDateTime statusChangedAt
) {}
