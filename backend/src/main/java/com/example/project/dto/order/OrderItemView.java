package com.example.project.dto.order;

import java.util.List;

/** 1 món trong đơn trả về cho frontend. */
public record OrderItemView(
        Long id, Long menuItemId, String itemName, int quantity, long unitPrice,
        String sizeName, long sizePrice, List<ToppingView> toppings, long toppingPrice,
        String sugarLevel, String iceLevel, String note, String status, long subtotal
) {}
