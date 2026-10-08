package com.example.project.dto.order;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Lượt khách đang ngồi ở 1 bàn + toàn bộ đơn của lượt đó.
 * payable = mọi đơn chưa hủy đều đã phục vụ (giữ tên cũ cho màn Phục vụ). Từ V6 đây KHÔNG còn là
 *           điều kiện để thu tiền: thu ngân thu được bất kỳ đơn nào chưa thanh toán.
 * unfinishedOrders = số đơn (#0004...) chưa phục vụ xong.
 * paidTotal / unpaidTotal = tổng tiền các đơn (chưa hủy) đã / chưa thanh toán; unpaidOrders = số đơn chưa thanh toán.
 */
public record SessionView(
        Long sessionId, String sessionCode, String status, LocalDateTime openedAt,
        Long tableId, String tableNumber, CustomerView customer,
        long total, boolean payable, List<String> unfinishedOrders, List<OrderView> orders,
        long paidTotal, long unpaidTotal, List<String> unpaidOrders
) {}
