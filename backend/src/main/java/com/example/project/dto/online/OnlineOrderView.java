package com.example.project.dto.online;

import com.example.project.dto.order.OrderItemView;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO trả về cho màn hình Đặt hàng & Tra cứu đơn online của khách.
 * Chứa đầy đủ thông tin đơn hàng, danh sách món, trạng thái giao hàng và thanh toán.
 */
public record OnlineOrderView(
        Long orderId,
        String orderNumber,
        String displayNumber,
        String status,
        String customerName,
        String customerPhone,
        String deliveryAddress,
        String deliveryStatus,
        String customerNote,
        String cancelReason,
        String paymentMethod,
        String paymentStatus,
        long totalAmount,
        LocalDateTime createdAt,
        List<OrderItemView> items,
        String qrPaymentUrl,
        // Thông tin giao hàng (Iter 3): ai đi giao và các mốc thời gian. Chưa gán thì null.
        String assignedWaiterName,
        LocalDateTime assignedAt,
        LocalDateTime pickedUpAt,
        LocalDateTime deliveredAt,
        LocalDateTime failedAt,
        String failureReason
) {}
