package com.example.project.dto;

import com.example.project.entity.Order;
import com.example.project.entity.enums.OrderStatus;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id, String orderNumber, String tableNumber, OrderStatus status,
        String customerNote, Long totalAmount, LocalDateTime createdAt, List<OrderItemResponse> items
) {
    public static OrderResponse from(Order o) {
        String table = o.getTableSession() == null ? null : o.getTableSession().getTable().getTableNumber();
        return new OrderResponse(o.getId(), o.getOrderNumber(), table, o.getStatus(), o.getCustomerNote(),
                o.getTotalAmount(), o.getCreatedAt(), o.getItems().stream().map(OrderItemResponse::from).toList());
    }
}
