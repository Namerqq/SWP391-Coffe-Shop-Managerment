package com.example.project.dto.cashier;

import com.example.project.dto.order.CustomerView;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.refund.RefundView;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UC-C09 View and Issue receipt. discount = subtotal - total (giảm giá bằng điểm).
 * orders = các đơn được thu trong hóa đơn này (tại bàn có thể chỉ là 1 phần các đơn của bàn).
 * tableId / tableStillOpen: bàn còn đơn chưa phục vụ hoặc chưa thanh toán thì màn hóa đơn có nút quay lại bàn.
 * qrAutoConfirmed: khách trả bằng mã QR payOS, hệ thống tự xác nhận (thu ngân không bấm xác nhận).
 * refunds (ThangNN Iter3): các phiếu hoàn tiền của hóa đơn này (chờ chuyển khoản / đã hoàn), cũ trước.
 * refundedAmount = tổng tiền các phiếu hoàn. Hóa đơn đã có hoàn tiền: orders chỉ còn món chưa hoàn,
 * món đã hoàn ghi trong note của từng phiếu; subtotal / discount / total vẫn là số lúc thu tiền.
 */
public record ReceiptView(
        String shopName, String shopAddress, String shopPhone,
        Long paymentId, String paymentCode, LocalDateTime paidAt, String cashierName, String paymentMethod,
        String place, boolean takeaway, String sessionCode, List<OrderView> orders,
        long subtotal, long discount, long total, int pointsRedeemed, int pointsEarned, CustomerView customer,
        Long tableId, boolean tableStillOpen, boolean qrAutoConfirmed,
        List<RefundView> refunds, long refundedAmount
) {}
