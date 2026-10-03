package com.example.project.dto.order;

/** 1 topping đã chọn (cũng là định dạng lưu trong cột order_items.topping_details). */
public record ToppingView(Long id, String name, long price) {}
