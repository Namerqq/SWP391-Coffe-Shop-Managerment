package com.example.project.dto.onlinepay;

/**
 * Kết quả khách đặt online tra điểm theo SĐT (BF-03-2 "Search customer by phone").
 * member = false: SĐT chưa là thành viên, points = 0.
 * pointValueVnd = 1 điểm giảm bao nhiêu tiền; vndPerPoint = trả bao nhiêu tiền được 1 điểm (lấy từ Cài đặt hệ thống).
 */
public record OnlineLoyaltyView(boolean member, String phoneNumber, String fullName, int points,
                                long pointValueVnd, long vndPerPoint) {}
