package com.example.project.dto.order;

import java.util.List;

/** Menu cho màn hình nhân viên (gọi món, sửa đơn): món đang bán + danh sách Size + Topping. */
public record StaffMenuResponse(List<MenuCategoryView> categories, List<MenuOptionView> sizes, List<MenuOptionView> toppings) {}
