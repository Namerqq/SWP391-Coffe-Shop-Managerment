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
import java.util.Locale;

/**
 * Đọc thực đơn dùng chung cho các màn hình gọi món của khách và nhân viên.
 * Size chỉ xuất hiện trong lựa chọn; topping vừa là lựa chọn vừa được bán riêng.
 */
@Service
public class MenuCatalogService {

    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;

    public MenuCatalogService(
            CategoryRepository categoryRepository,
            MenuItemRepository menuItemRepository
    ) {
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
    }

    /** Lấy món bán riêng đang AVAILABLE, nhóm theo danh mục ACTIVE và bỏ nhóm rỗng. */
    @Transactional(readOnly = true)
    public List<MenuCategoryView> sellableMenu() {
        List<MenuItem> allItems = menuItemRepository.findAllByOrderByNameAsc();
        return buildSellableMenu(allItems);
    }

    /** Trả thực đơn cùng danh sách size và topping đang bán cho màn hình gọi món. */
    @Transactional(readOnly = true)
    public StaffMenuResponse staffMenu() {
        List<MenuItem> allItems = menuItemRepository.findAllByOrderByNameAsc();

        // Dùng chung dữ liệu món cho cả ba phần, tránh truy vấn lại toàn bộ menu.
        return new StaffMenuResponse(
                buildSellableMenu(allItems),
                buildOptions(allItems, Category.SIZE),
                buildOptions(allItems, Category.TOPPING)
        );
    }

    /** Duyệt danh mục theo ID; các món trong mỗi nhóm giữ thứ tự tên từ repository. */
    private List<MenuCategoryView> buildSellableMenu(List<MenuItem> allItems) {
        List<MenuCategoryView> menu = new ArrayList<>();

        for (Category category : categoryRepository.findAllByOrderByIdAsc()) {
            if (!Category.ACTIVE.equals(category.getStatus())) {
                continue;
            }

            List<MenuItemView> categoryItems = findSellableItems(allItems, category);
            if (categoryItems.isEmpty()) {
                continue;
            }

            menu.add(new MenuCategoryView(
                    category.getId(),
                    category.getName(),
                    category.getDescription(),
                    categoryItems
            ));
        }

        return menu;
    }

    /** Chọn món thuộc danh mục, đang bán và được phép gọi riêng, rồi chuyển sang DTO. */
    private List<MenuItemView> findSellableItems(List<MenuItem> allItems, Category category) {
        return allItems.stream()
                .filter(item -> category.getId().equals(item.getCategory().getId()))
                .filter(MenuItem::isSellStandalone)
                .filter(item -> MenuItem.AVAILABLE.equals(item.getAvailabilityStatus()))
                .map(item -> new MenuItemView(
                        item.getId(),
                        category.getId(),
                        item.getName(),
                        item.getDescription(),
                        item.getBasePrice(),
                        item.getImageUrl(),
                        category.getCategoryType()
                ))
                .toList();
    }

    /** Lấy lựa chọn đang bán theo loại danh mục, sắp theo giá tăng dần. */
    private List<MenuOptionView> buildOptions(List<MenuItem> allItems, String categoryType) {
        String normalizedType = categoryType.toUpperCase(Locale.ROOT);

        return allItems.stream()
                .filter(item -> item.getCategory().isType(normalizedType))
                .filter(MenuItem::isSellable)
                .sorted(Comparator.comparing(MenuItem::getBasePrice))
                .map(item -> new MenuOptionView(
                        item.getId(),
                        item.getName(),
                        item.getBasePrice()
                ))
                .toList();
    }
}
