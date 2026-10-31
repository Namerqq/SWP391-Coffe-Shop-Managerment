package com.example.project.dto.order;

/** Lựa chọn Size / Topping: tên và số tiền cộng thêm. */
public record MenuOptionView(Long id, String name, long price, java.util.List<Long> allowedItemIds) {
    public MenuOptionView(Long id, String name, long price) { this(id, name, price, java.util.List.of()); }
}
