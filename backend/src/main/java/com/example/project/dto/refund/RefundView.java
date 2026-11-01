package com.example.project.dto.refund;

import java.time.LocalDateTime;

/**
 * 1 phiếu hoàn tiền (ThangNN Iter3) = 1 dòng payments REFUND_PENDING / REFUNDED.
 * status: REFUND_PENDING = chờ chuyển khoản trả khách, REFUNDED = đã trả tiền xong (refundedAt = lúc trả).
 * method: CASH (trả tiền mặt tại quầy) / BANK_TRANSFER (chuyển khoản trả khách).
 * note: món được hoàn, lý do, điểm bị trừ / trả lại, mã giao dịch chuyển khoản trả khách.
 * cashierName: thu ngân tạo phiếu. place: số bàn / "Mang đi" / "Giao hàng".
 * paymentId / paymentCode / paymentMethod / paidAmount: hóa đơn gốc khách đã trả.
 * paymentReference: mã giao dịch ngân hàng lúc khách trả bằng QR payOS (null nếu không có) để tra tài khoản đã chuyển.
 */
public record RefundView(
        Long id, String refundCode, String status, String method, long amount, String note,
        LocalDateTime createdAt, LocalDateTime refundedAt, String cashierName,
        Long orderId, String orderNumber, String displayNumber, String fulfillmentType, String place,
        String customerName, String customerPhone,
        Long paymentId, String paymentCode, String paymentMethod, long paidAmount, String paymentReference
) {}
