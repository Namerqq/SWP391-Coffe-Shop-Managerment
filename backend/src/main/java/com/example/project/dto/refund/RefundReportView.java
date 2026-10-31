package com.example.project.dto.refund;

import java.time.LocalDate;
import java.util.List;

/**
 * Quản lý hậu kiểm hoàn tiền (chỉ xem): phiếu hoàn tạo trong [from, to] (tính cả 2 ngày), mới nhất trước.
 * refundedTotal = tiền đã trả khách, pendingTotal = tiền còn chờ chuyển khoản trả khách.
 */
public record RefundReportView(LocalDate from, LocalDate to, int count, long refundedTotal, long pendingTotal,
                               List<RefundView> refunds) {}
