package com.example.project.dto.order;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Đơn hàng trả về cho frontend (dùng chung cho Barista, Waiter, Cashier). totalAmount = tổng các món chưa hủy.
 * 2 trạng thái song song: status = tiến trình phục vụ, paymentStatus = UNPAID | PAID.
 * paidAt / paymentId = lúc thu và hóa đơn đã thu đơn này (null nếu chưa thanh toán).
 */
public record OrderView(
        Long id, String orderNumber, String displayNumber, String status, String source, String fulfillmentType,
        Long tableSessionId, Long tableId, String tableNumber,
        String customerName, String customerPhone, String customerNote, String cancelReason,
        long totalAmount, LocalDateTime createdAt, LocalDateTime updatedAt, List<OrderItemView> items,
        String paymentStatus, LocalDateTime paidAt, Long paymentId
) {}
