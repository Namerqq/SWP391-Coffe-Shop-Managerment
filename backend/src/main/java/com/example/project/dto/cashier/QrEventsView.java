package com.example.project.dto.cashier;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Các mã QR vừa thanh toán xong (PAID) hoặc vừa nhận tiền mà không ghi được (MISMATCH), để mọi màn thu ngân
 * hiện thông báo. serverTime = mốc gửi lại ở lần hỏi sau (?since=...).
 */
public record QrEventsView(LocalDateTime serverTime, List<QrPaymentView> events) {}
