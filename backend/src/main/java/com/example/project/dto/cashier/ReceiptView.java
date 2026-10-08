package com.example.project.dto.cashier;

import com.example.project.dto.order.CustomerView;
import com.example.project.dto.order.OrderView;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UC-C09 View and Issue receipt. discount = subtotal - total (giảm giá bằng điểm).
 * orders = các đơn được thu trong hóa đơn này (tại bàn có thể chỉ là 1 phần các đơn của bàn).
 * tableId / tableStillOpen: bàn còn đơn chưa phục vụ hoặc chưa thanh toán thì màn hóa đơn có nút quay lại bàn.
 */
public record ReceiptView(
        String shopName, String shopAddress, String shopPhone,
        Long paymentId, String paymentCode, LocalDateTime paidAt, String cashierName, String paymentMethod,
        String place, boolean takeaway, String sessionCode, List<OrderView> orders,
        long subtotal, long discount, long total, int pointsRedeemed, int pointsEarned, CustomerView customer,
        Long tableId, boolean tableStillOpen
) {}
