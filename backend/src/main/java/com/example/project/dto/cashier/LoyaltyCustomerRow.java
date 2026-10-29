package com.example.project.dto.cashier;

import com.example.project.entity.Customer;

import java.time.LocalDateTime;

/** 1 dòng trên màn Khách thân thiết. lastActivityAt = lần cộng / dùng điểm gần nhất (null = chưa có). */
public record LoyaltyCustomerRow(Long id, String phoneNumber, String fullName, int currentPoints,
                                 LocalDateTime createdAt, LocalDateTime lastActivityAt) {

    public static LoyaltyCustomerRow from(Customer c, LocalDateTime lastActivityAt) {
        return new LoyaltyCustomerRow(c.getId(), c.getPhoneNumber(), c.getFullName(),
                c.getCurrentPoints() == null ? 0 : c.getCurrentPoints(), c.getCreatedAt(), lastActivityAt);
    }
}
