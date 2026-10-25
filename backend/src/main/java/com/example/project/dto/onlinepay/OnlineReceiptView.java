package com.example.project.dto.onlinepay;

import com.example.project.dto.order.OrderItemView;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Hóa đơn điện tử của 1 đơn đặt online (BF-03-2 "Generate e-receipt", UC-C09), tra bằng mã đơn.
 * Ai biết mã đơn cũng tra được nên KHÔNG có địa chỉ giao hàng (Q3-A). orderNumber = mã đơn đầy đủ (261023-0008).
 * discount chỉ còn khác 0 ở các đơn cũ trước khi bỏ tích điểm cho khách online; total = số tiền đã trả.
 */
public record OnlineReceiptView(
        String shopName, String shopAddress, String shopPhone,
        String orderNumber, String paymentCode, LocalDateTime paidAt, String paymentMethod,
        String customerName, List<OrderItemView> items,
        long subtotal, long discount, long total
) {}
