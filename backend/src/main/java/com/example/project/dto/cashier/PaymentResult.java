package com.example.project.dto.cashier;

/**
 * Kết quả thanh toán. orderId / orderNumber chỉ có với đơn mang đi.
 * tableReleased = true: mọi đơn của bàn đã phục vụ và đã thanh toán nên bàn đã trả về trống.
 */
public record PaymentResult(Long paymentId, String paymentCode, long amount, Long orderId, String orderNumber,
                            boolean tableReleased) {}
