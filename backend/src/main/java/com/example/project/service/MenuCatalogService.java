package com.example.project.service;

import com.example.project.dto.order.MenuCategoryView;
import com.example.project.dto.order.MenuItemView;
import com.example.project.dto.order.MenuOptionView;
import com.example.project.dto.order.StaffMenuResponse;
import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import com.example.project.repository.CategoryRepository;
import com.example.project.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Đọc menu đang bán (dùng chung: trang Thực đơn của khách, màn hình gọi món / sửa đơn của nhân viên). */
@Service
public class MenuCatalogService {

    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;

    public MenuCatalogService(CategoryRepository categoryRepository, MenuItemRepository menuItemRepository) {
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
    }

    /** Món đang bán, nhóm theo danh mục ACTIVE (bỏ 2 danh mục lựa chọn Size / Topping). */
    @Transactional(readOnly = true)
    public List<MenuCategoryView> sellableMenu() {
        List<MenuItem> all = menuItemRepository.findAllByOrderByNameAsc();
        List<MenuCategoryView> result = new ArrayList<>();
        for (Category c : categoryRepository.findAllByOrderByIdAsc()) {
            if (!Category.ACTIVE.equals(c.getStatus()) || c.isOptionGroup()) continue;
            List<MenuItemView> items = all.stream()
                    .filter(m -> m.getCategory().getId().equals(c.getId()) && MenuItem.AVAILABLE.equals(m.getAvailabilityStatus()))
                    .map(m -> new MenuItemView(m.getId(), c.getId(), m.getName(), m.getDescription(),
                            m.getBasePrice(), m.getImageUrl()))
                    .toList();
            if (!items.isEmpty()) result.add(new MenuCategoryView(c.getId(), c.getName(), c.getDescription(), items));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public StaffMenuResponse staffMenu() {
        List<MenuItem> all = menuItemRepository.findAllByOrderByNameAsc();
        return new StaffMenuResponse(sellableMenu(), options(all, Category.SIZE), options(all, Category.TOPPING));
    }

    private List<MenuOptionView> options(List<MenuItem> all, String group) {
        return all.stream()
                .filter(m -> group.equalsIgnoreCase(m.getCategory().getName())
                        && MenuItem.AVAILABLE.equals(m.getAvailabilityStatus()))
                .sorted(Comparator.comparing(MenuItem::getBasePrice))
                .map(m -> new MenuOptionView(m.getId(), m.getName(), m.getBasePrice()))
                .toList();
    }
}
