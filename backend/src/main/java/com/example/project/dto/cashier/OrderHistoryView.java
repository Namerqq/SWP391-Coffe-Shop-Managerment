package com.example.project.dto.cashier;

import com.example.project.dto.order.OrderView;

import java.time.LocalDate;
import java.util.List;

/**
 * UC-C15 View Bills History — màn "Lịch sử đơn" của Thu ngân (SRS 1.3.6 Today's order and bill history).
 * orders: mọi đơn tạo trong ngày date (mới nhất trước), gồm tại bàn, mang đi và giao hàng online.
 * Lọc theo loại đơn / trạng thái / ô tìm làm ở frontend (1 ngày ít đơn).
 * summary: tiền đã thu trong ngày tính theo hóa đơn (payments có paidAt trong ngày), tách tiền mặt / chuyển khoản.
 */
public record OrderHistoryView(LocalDate date, List<Row> orders, Summary summary) {

    /**
     * 1 dòng = 1 đơn. Đơn đã thanh toán có thêm thông tin hóa đơn (mã, phương thức, thu ngân) để mở trang xem / in lại.
     * cashierName null với đơn online trả QR (hệ thống tự xác nhận, không có thu ngân).
     */
    public record Row(OrderView order, String paymentCode, String paymentMethod, String cashierName) {}

    /** billCount = số hóa đơn đã thu; total = cash + transfer. */
    public record Summary(int billCount, long total, long cash, long transfer) {}
}
