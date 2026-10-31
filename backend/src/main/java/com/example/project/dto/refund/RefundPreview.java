package com.example.project.dto.refund;

/**
 * Xem trước khi hoàn tiền món của đơn tại quầy (chưa ghi gì).
 * itemsValue: tổng giá các món chọn hoàn (theo giá món). refundable: số tiền hóa đơn gốc còn hoàn được.
 * amount: số tiền sẽ trả khách (chia theo tỉ lệ khách thực trả nếu hóa đơn có dùng điểm).
 * fullRefund: hoàn hết món còn lại của hóa đơn (khi đó trả lại cả điểm khách đã dùng).
 * pointsTakenBack / pointsReturned: điểm sẽ trừ lại / trả lại cho khách thân thiết (customerName), 0 nếu không có.
 * paymentMethod / paidAmount: hóa đơn gốc. hasMadeItems: có món đã pha xong (sẽ ghi biên bản sự cố).
 */
public record RefundPreview(
        long itemsValue, long refundable, long amount, boolean fullRefund,
        int pointsTakenBack, int pointsReturned, String customerName,
        String paymentMethod, long paidAmount, boolean hasMadeItems
) {}
