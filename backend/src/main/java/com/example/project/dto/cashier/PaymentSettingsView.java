package com.example.project.dto.cashier;

/** Cấu hình dùng khi thu tiền: quy đổi điểm + tài khoản nhận chuyển khoản (VietQR). */
public record PaymentSettingsView(
        long pointValueVnd, long vndPerPoint,
        String bankBin, String bankAccountNumber, String bankAccountHolder
) {}
