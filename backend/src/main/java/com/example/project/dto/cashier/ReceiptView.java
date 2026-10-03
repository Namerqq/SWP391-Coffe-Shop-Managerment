package com.example.project.dto.cashier;

import com.example.project.dto.order.CustomerView;
import com.example.project.dto.order.OrderView;

import java.time.LocalDateTime;
import java.util.List;

/** UC-C09 View and Issue receipt. discount = subtotal - total (giảm giá bằng điểm). */
public record ReceiptView(
        String shopName, String shopAddress, String shopPhone,
        Long paymentId, String paymentCode, LocalDateTime paidAt, String cashierName, String paymentMethod,
        String place, boolean takeaway, String sessionCode, List<OrderView> orders,
        long subtotal, long discount, long total, int pointsRedeemed, int pointsEarned, CustomerView customer
) {}
