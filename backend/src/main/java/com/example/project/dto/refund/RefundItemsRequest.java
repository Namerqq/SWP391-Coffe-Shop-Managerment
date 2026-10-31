package com.example.project.dto.refund;

import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Hoàn tiền các món chưa mang ra của 1 đơn tại quầy (tại bàn / mang đi) đã thanh toán.
 * method: CASH (trả tiền mặt ngay) / BANK_TRANSFER (chuyển khoản trả khách, phiếu chờ nhập mã giao dịch).
 * expectedAmount: số tiền thu ngân đang thấy ở bước xem trước, không bắt buộc. Lệch (đơn vừa đổi) -> 409.
 */
public record RefundItemsRequest(
        List<Long> itemIds,
        @Size(max = 200, message = "Lý do tối đa 200 ký tự") String reason,
        String method,
        Long expectedAmount
) {}
