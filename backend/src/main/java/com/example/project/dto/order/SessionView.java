package com.example.project.dto.order;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Lượt khách đang ngồi ở 1 bàn + toàn bộ đơn của lượt đó.
 * payable = mọi đơn chưa hủy đều đã phục vụ -> thu ngân được tính tiền.
 * unfinishedOrders = số đơn (#0004...) chưa phục vụ xong.
 */
public record SessionView(
        Long sessionId, String sessionCode, String status, LocalDateTime openedAt,
        Long tableId, String tableNumber, CustomerView customer,
        long total, boolean payable, List<String> unfinishedOrders, List<OrderView> orders
) {}
