package com.example.project.service;

import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import java.util.List;

/** Cùng một quy tắc đếm cho trang tổng quan và trang quản lý menu. */
public final class MenuStatistics {
    private MenuStatistics() {}

    public record Counts(long total, long selling, long unavailable) {}

    public static Counts count(List<MenuItem> items) {
        List<MenuItem> countedItems = items.stream()
                .filter(item -> item.getCategory() != null)
                .filter(item -> Category.ACTIVE.equals(item.getCategory().getStatus()))
                .filter(item -> !item.getCategory().isType("SIZE"))
                .filter(item -> !MenuItem.INACTIVE.equals(item.getAvailabilityStatus()))
                .filter(MenuItem::isSellStandalone)
                .toList();

        long selling = countedItems.stream().filter(MenuItem::isSellable).count();
        long unavailable = countedItems.stream()
                .filter(item -> MenuItem.UNAVAILABLE.equals(item.getAvailabilityStatus()))
                .count();
        return new Counts(countedItems.size(), selling, unavailable);
    }
}
