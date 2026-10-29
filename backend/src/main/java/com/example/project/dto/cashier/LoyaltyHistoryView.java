package com.example.project.dto.cashier;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Lịch sử điểm của 1 khách (UC-C12). Chỉ xem: giao dịch điểm không sửa / xóa (SRS 4.4 [11]).
 * totalEarned = tổng điểm đã tích, totalRedeemed = tổng điểm đã dùng (số dương).
 */
public record LoyaltyHistoryView(LoyaltyCustomerRow customer, int totalEarned, int totalRedeemed,
                                 List<Entry> transactions) {

    /**
     * 1 lần cộng / trừ điểm. type = EARN | REDEEM | ADJUSTMENT | REFUND, pointsChange dương = cộng, âm = trừ.
     * balanceAfter = số điểm của khách ngay sau giao dịch này (tính ngược từ điểm hiện có).
     * paymentId / paymentCode = hóa đơn tạo ra giao dịch (null nếu không gắn hóa đơn).
     */
    public record Entry(Long id, String type, int pointsChange, int balanceAfter, String note,
                        LocalDateTime createdAt, Long paymentId, String paymentCode) {}
}
