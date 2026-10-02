package com.example.project.dto;

import com.example.project.entity.OrderItem;

public record OrderItemResponse(
        Long id, Long menuItemId, String menuItemName, Integer quantity, Long unitPrice,
        String sugarLevel, String iceLevel, String note, Long subtotal
) {
    public static OrderItemResponse from(OrderItem i) {
        return new OrderItemResponse(i.getId(), i.getMenuItem().getId(), i.getMenuItem().getName(),
                i.getQuantity(), i.getUnitPrice(), i.getSugarLevel(), i.getIceLevel(), i.getNote(), i.getSubtotal());
    }
}
