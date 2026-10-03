package com.example.project.dto.order;

import com.example.project.entity.Customer;

/** Khách thân thiết (số điện thoại, tên, điểm hiện có). */
public record CustomerView(Long id, String phoneNumber, String fullName, int currentPoints) {
    public static CustomerView from(Customer c) {
        return c == null ? null
                : new CustomerView(c.getId(), c.getPhoneNumber(), c.getFullName(),
                        c.getCurrentPoints() == null ? 0 : c.getCurrentPoints());
    }
}
