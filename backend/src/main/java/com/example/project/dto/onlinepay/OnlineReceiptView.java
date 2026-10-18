package com.example.project.dto.onlinepay;

import com.example.project.dto.order.OrderItemView;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 1 hóa đơn điện tử của đơn đặt online (BF-03-2 "Generate e-receipt", UC-C09).
 * Ai biết SĐT cũng tra được nên KHÔNG có địa chỉ giao hàng (Q3-A). discount = giảm bằng điểm, total = số tiền đã trả.
 */
public record OnlineReceiptView(
        String shopName, String shopAddress, String shopPhone,
        String orderNumber, String paymentCode, LocalDateTime paidAt, String paymentMethod,
        String customerName, List<OrderItemView> items,
        long subtotal, long discount, long total, int pointsRedeemed, int pointsEarned
) {}
