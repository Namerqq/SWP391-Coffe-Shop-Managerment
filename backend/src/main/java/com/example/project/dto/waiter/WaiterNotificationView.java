package com.example.project.dto.waiter;

/** 1 thông báo cho phục vụ: món bị pha chế hủy vì hết nguyên liệu, cần báo lại cho khách. */
public record WaiterNotificationView(
        Long itemId, Long orderId, String displayNumber, String tableNumber,
        String itemName, int quantity
) {}
