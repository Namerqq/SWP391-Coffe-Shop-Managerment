package com.example.project.dto.cashier;

/** Kết quả thanh toán. orderId / orderNumber chỉ có với đơn mang đi. */
public record PaymentResult(Long paymentId, String paymentCode, long amount, Long orderId, String orderNumber) {}
