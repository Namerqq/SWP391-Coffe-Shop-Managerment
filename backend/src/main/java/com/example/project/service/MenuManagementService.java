package com.example.project.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.project.dto.menu.CategoryRequest;
import com.example.project.dto.menu.CategoryView;
import com.example.project.dto.menu.ManagedItemView;
import com.example.project.dto.menu.MenuRequest;
import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import com.example.project.exception.ApiException;
import com.example.project.repository.CategoryRepository;
import com.example.project.repository.MenuItemRepository;

/**
 * Quản lý món và danh mục của Manager: đọc, thêm, sửa, bật/tắt bán và xoá mềm.
 * Mỗi thao tác ghi chạy trong một transaction; không cập nhật dữ liệu đơn đã gửi.
 */
@Service
@Transactional
public class MenuManagementService {

    private static final String SIZE_TYPE = "SIZE";
    private static final String DRINK_TYPE = "DRINK";
    private static final String FOOD_TYPE = "FOOD";
    private static final Set<String> MANAGED_CATEGORY_TYPES = Set.of(
            DRINK_TYPE, FOOD_TYPE, "TOPPING"
    );
    private static final Pattern UPLOADED_IMAGE_PATH = Pattern.compile(
            "/uploads/[a-z0-9-]+/[a-zA-Z0-9-]+\\.(jpg|jpeg|png|webp|gif)"
    );

    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final ToppingCompatibilityService toppingCompatibility;

    public MenuManagementService(
            CategoryRepository categoryRepository,
            MenuItemRepository menuItemRepository,
            ToppingCompatibilityService toppingCompatibility
    ) {
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.toppingCompatibility = toppingCompatibility;
    }

    // Đọc dữ liệu cho trang Menu Management.

    /** Trả món, danh mục và thống kê; ẩn món đã xoá, danh mục đã xoá và nhóm SIZE. */
    @Transactional(readOnly = true)
    public Map<String, Object> catalog() {
        List<MenuItem> visibleItems = menuItemRepository.findAllByOrderByNameAsc().stream()
                .filter(this::isVisibleItem)
                .toList();
        List<Category> visibleCategories = categoryRepository.findAllByOrderByIdAsc().stream()
                .filter(this::isManagedCategory)
                .toList();

        return Map.of(
                "items", visibleItems.stream().map(this::toManagedItemView).toList(),
                "categories", buildCategoryViews(visibleCategories, visibleItems),
                "stats", buildStatistics(visibleItems, visibleCategories)
        );
    }

    // Thêm, sửa và xoá danh mục.

    /** Tạo hoặc sửa tên/loại danh mục sau khi kiểm tra tên trùng và loại được hỗ trợ. */
    public CategoryView saveCategory(Long id, CategoryRequest request) {
        String name = request.name().trim();
        Category category = id == null ? new Category() : requireManagedCategory(id);

        validateCategoryName(id, name);
        validateCategoryType(request.categoryType());

        if (!category.getCategoryType().equals(request.categoryType()) && id != null) {
            menuItemRepository.findAll().stream()
                    .filter(item -> id.equals(item.getCategory().getId()))
                    .forEach(item -> toppingCompatibility.removeForItem(item.getId()));
        }
        category.setName(name);
        category.setCategoryType(request.categoryType());
        categoryRepository.save(category);

        return new CategoryView(
                category.getId(), category.getName(), category.getCategoryType(), 0
        );
    }

    /** Chỉ xoá mềm danh mục khi không còn món chưa xoá thuộc danh mục đó. */
    public void deleteCategory(Long id) {
        Category category = requireManagedCategory(id);
        boolean containsItems = menuItemRepository.findAll().stream()
                .filter(this::isNotDeleted)
                .anyMatch(item -> id.equals(item.getCategory().getId()));

        if (containsItems) {
            throw ApiException.conflict("Danh mục còn món. Hãy chuyển hoặc xoá các món trước.");
        }

        category.setStatus(Category.INACTIVE);
        categoryRepository.save(category);
    }

    // Thêm, sửa, bật/tắt bán và xoá món.

    /** Tạo hoặc sửa món; kiểm tra danh mục, tên trùng và đường dẫn ảnh trước khi lưu. */
    public ManagedItemView saveItem(Long id, MenuRequest request) {
        Category category = requireManagedCategory(request.categoryId());
        String name = request.name().trim();
        MenuItem item = id == null ? new MenuItem() : requireManagedItem(id);

        validateItemName(id, category.getId(), name);
        String imageUrl = normalizeImageUrl(request.imageUrl());

        if (id != null && !item.getCategory().getCategoryType().equals(category.getCategoryType())) {
            toppingCompatibility.removeForItem(id);
        }
        if (!category.isType("TOPPING") && request.allowedItemIds() != null && !request.allowedItemIds().isEmpty()) {
            throw ApiException.badRequest("Chỉ cấu hình món đi kèm trong form topping.");
        }
        item.setCategory(category);
        item.setName(name);
        item.setBasePrice(request.basePrice());
        item.setDescription(request.description());
        item.setImageUrl(imageUrl);
        item.setSellStandalone(true);

        MenuItem saved = menuItemRepository.save(item);
        if (category.isType("TOPPING") && request.allowedItemIds() != null) {
            toppingCompatibility.replace(saved.getId(), request.allowedItemIds());
        }
        return toManagedItemView(saved);
    }

    /** Chuyển món chưa xoá giữa AVAILABLE (đang bán) và UNAVAILABLE (tạm hết). */
    public ManagedItemView availability(Long id, boolean available) {
        MenuItem item = requireManagedItem(id);
        item.setAvailabilityStatus(available ? MenuItem.AVAILABLE : MenuItem.UNAVAILABLE);
        return toManagedItemView(menuItemRepository.save(item));
    }

    /** Ẩn món bằng trạng thái INACTIVE, giữ bản ghi để đơn cũ tiếp tục tham chiếu. */
    public void deleteItem(Long id) {
        MenuItem item = requireManagedItem(id);
        toppingCompatibility.removeForItem(id);
        item.setAvailabilityStatus(MenuItem.INACTIVE);
        menuItemRepository.save(item);
    }

    // Chuyển dữ liệu sang DTO và tính thống kê.

    /** Chuyển entity món sang dữ liệu trả cho giao diện quản lý. */
    private ManagedItemView toManagedItemView(MenuItem item) {
        return new ManagedItemView(
                item.getId(),
                item.getCategory().getId(),
                item.getName(),
                item.getDescription(),
                item.getBasePrice(),
                item.getImageUrl(),
                item.getAvailabilityStatus(),
                item.isSellStandalone(),
                item.getCategory().isType("TOPPING") ? toppingCompatibility.allowedItemIds(item.getId()) : List.of()
        );
    }

    /** Gắn số món hiển thị vào từng danh mục, bao gồm món đang bán và tạm hết. */
    private List<CategoryView> buildCategoryViews(
            List<Category> categories,
            List<MenuItem> visibleItems
    ) {
        return categories.stream()
                .map(category -> new CategoryView(
                        category.getId(),
                        category.getName(),
                        category.getCategoryType(),
                        visibleItems.stream()
                                .filter(item -> category.getId().equals(item.getCategory().getId()))
                                .count()
                ))
                .toList();
    }

    /** Đếm món bán riêng, trạng thái bán và danh mục; tính giá trung bình độc lập. */
    private Map<String, Object> buildStatistics(
            List<MenuItem> visibleItems,
            List<Category> visibleCategories
    ) {
        List<MenuItem> standaloneItems = visibleItems.stream()
                .filter(MenuItem::isSellStandalone)
                .toList();
        long sellingCount = standaloneItems.stream()
                .filter(MenuItem::isSellable)
                .count();
        long unavailableCount = standaloneItems.stream()
                .filter(item -> MenuItem.UNAVAILABLE.equals(item.getAvailabilityStatus()))
                .count();

        return Map.of(
                "total", standaloneItems.size(),
                "selling", sellingCount,
                "unavailable", unavailableCount,
                "categoryCount", (long) visibleCategories.size(),
                "averagePrice", calculateAveragePrice(visibleItems)
        );
    }

    /** Chỉ lấy giá đồ uống và bánh, kể cả tạm hết; làm tròn đến đồng, trả 0 khi rỗng. */
    private long calculateAveragePrice(List<MenuItem> visibleItems) {
        List<MenuItem> pricedItems = visibleItems.stream()
                .filter(item -> item.getCategory().isType(DRINK_TYPE)
                        || item.getCategory().isType(FOOD_TYPE))
                .toList();

        if (pricedItems.isEmpty()) {
            return 0;
        }

        BigDecimal totalPrice = pricedItems.stream()
                .map(item -> BigDecimal.valueOf(item.getBasePrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return totalPrice.divide(
                BigDecimal.valueOf(pricedItems.size()), 0, RoundingMode.HALF_UP
        ).longValueExact();
    }

    // Kiểm tra trạng thái và lấy entity hợp lệ.

    /** Phân biệt món chưa xoá với món INACTIVE; món tạm hết vẫn được quản lý. */
    private boolean isNotDeleted(MenuItem item) {
        return !MenuItem.INACTIVE.equals(item.getAvailabilityStatus());
    }

    /** Danh mục được quản lý khi đang ACTIVE và không phải nhóm SIZE. */
    private boolean isManagedCategory(Category category) {
        return Category.ACTIVE.equals(category.getStatus()) && !category.isType(SIZE_TYPE);
    }

    /** Món được hiển thị khi chưa xoá và thuộc danh mục được quản lý. */
    private boolean isVisibleItem(MenuItem item) {
        return isNotDeleted(item) && isManagedCategory(item.getCategory());
    }

    /** Lấy danh mục để ghi dữ liệu; từ chối danh mục không tồn tại, đã xoá hoặc SIZE. */
    private Category requireManagedCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.badRequest("Danh mục không tồn tại."));

        if (!Category.ACTIVE.equals(category.getStatus())) {
            throw ApiException.badRequest("Danh mục đã bị xoá.");
        }
        if (category.isType(SIZE_TYPE)) {
            throw ApiException.badRequest("Size là lựa chọn gọi món, không thuộc Menu Management.");
        }

        return category;
    }

    /** Lấy món để chỉnh sửa; từ chối món không tồn tại, đã xoá hoặc thuộc nhóm SIZE. */
    private MenuItem requireManagedItem(Long id) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> ApiException.badRequest("Món không tồn tại."));

        if (!isNotDeleted(item)) {
            throw ApiException.badRequest("Món đã bị xoá.");
        }
        if (item.getCategory().isType(SIZE_TYPE)) {
            throw ApiException.badRequest("Size không phải món bán riêng.");
        }

        return item;
    }

    // Kiểm tra dữ liệu nhập trước khi lưu.

    /** Không cho trùng tên danh mục, kể cả bản ghi đã xoá; bỏ qua chính bản ghi đang sửa. */
    private void validateCategoryName(Long id, String name) {
        boolean duplicate = categoryRepository.findAll().stream()
                .anyMatch(category -> category.getName().equalsIgnoreCase(name)
                        && !Objects.equals(category.getId(), id));

        if (duplicate) {
            throw ApiException.conflict("Tên danh mục đã tồn tại, kể cả danh mục đã xoá.");
        }
    }

    /** Chỉ cho phép Manager tạo hoặc đổi sang loại đồ uống, bánh/đồ ăn và topping. */
    private void validateCategoryType(String categoryType) {
        if (!MANAGED_CATEGORY_TYPES.contains(categoryType)) {
            throw ApiException.badRequest("Loại danh mục không hợp lệ.");
        }
    }

    /** Không cho trùng tên món trong cùng danh mục, kể cả món đã xoá. */
    private void validateItemName(Long id, Long categoryId, String name) {
        boolean duplicate = menuItemRepository.findAll().stream()
                .anyMatch(item -> categoryId.equals(item.getCategory().getId())
                        && item.getName().equalsIgnoreCase(name)
                        && !Objects.equals(item.getId(), id));

        if (duplicate) {
            throw ApiException.conflict("Tên món đã tồn tại trong danh mục này, kể cả món đã xoá.");
        }
    }

    /** Chuyển ảnh trống thành null; ảnh có giá trị phải đúng mẫu đường dẫn upload nội bộ. */
    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        if (!UPLOADED_IMAGE_PATH.matcher(imageUrl).matches()) {
            throw ApiException.badRequest("Vui lòng dùng ảnh tải lên từ hệ thống.");
        }

        return imageUrl;
    }
}
