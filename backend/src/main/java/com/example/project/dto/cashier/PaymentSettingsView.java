package com.example.project.dto.cashier;

/**
 * Cấu hình dùng khi thu tiền: quy đổi điểm + tài khoản nhận chuyển khoản thủ công (VietQR)
 * + QR payOS tự xác nhận (qrEnabled = backend đã có key payOS, qrTimeoutMinutes = thời gian tồn tại mã QR).
 */
public record PaymentSettingsView(
        long pointValueVnd, long vndPerPoint,
        String bankBin, String bankAccountNumber, String bankAccountHolder,
        boolean qrEnabled, long qrTimeoutMinutes
) {}
