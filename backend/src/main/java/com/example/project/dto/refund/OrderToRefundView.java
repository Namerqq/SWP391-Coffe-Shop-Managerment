package com.example.project.dto.refund;

import java.time.LocalDateTime;

/**
 * Đơn online đã trả QR nhưng đã bị hủy (thường là giao không thành công) và chưa có phiếu hoàn:
 * thu ngân quyết định tạo phiếu hoàn chuyển khoản.
 * deliveryStatus / failureReason: trạng thái giao hàng và lý do giao không thành công (nếu có).
 * amount: số tiền khách đã trả. paymentReference: mã giao dịch ngân hàng lúc khách trả QR.
 */
public record OrderToRefundView(
        Long orderId, String orderNumber, String displayNumber, String customerName, String customerPhone,
        String cancelReason, LocalDateTime cancelledAt, String deliveryStatus, String failureReason,
        Long paymentId, String paymentCode, long amount, String paymentReference
) {}
