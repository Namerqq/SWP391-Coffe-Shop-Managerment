package com.example.project.service;

import com.example.project.dto.menu.*;
import com.example.project.entity.*;
import com.example.project.exception.ApiException;
import com.example.project.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@Transactional
public class MenuManagementService {
    private final CategoryRepository categories;
    private final MenuItemRepository items;
    public MenuManagementService(CategoryRepository categories, MenuItemRepository items) {
        this.categories=categories; this.items=items;
    }
    private boolean active(MenuItem m) { return !MenuItem.INACTIVE.equals(m.getAvailabilityStatus()); }
    private ManagedItemView view(MenuItem m) {
        return new ManagedItemView(m.getId(),m.getCategory().getId(),m.getName(),m.getDescription(),
            m.getBasePrice(),m.getImageUrl(),m.getAvailabilityStatus(),m.isSellStandalone());
    }
    @Transactional(readOnly=true)
    public Map<String,Object> catalog() {
        var all=items.findAllByOrderByNameAsc().stream().filter(this::active).toList();
        var groups=categories.findAllByOrderByIdAsc().stream().filter(c->Category.ACTIVE.equals(c.getStatus()) && !c.isType("SIZE")).toList();
        var visible=all.stream().filter(m->Category.ACTIVE.equals(m.getCategory().getStatus()) && !m.getCategory().isType("SIZE")).toList();
        var sold=visible.stream().filter(MenuItem::isSellStandalone).toList();
        var priced=visible.stream().filter(m->m.getCategory().isType("DRINK") || m.getCategory().isType("FOOD")).toList();
        BigDecimal total=priced.stream().map(m->BigDecimal.valueOf(m.getBasePrice())).reduce(BigDecimal.ZERO,BigDecimal::add);
        long avg=priced.isEmpty()?0:total.divide(BigDecimal.valueOf(priced.size()),0,RoundingMode.HALF_UP).longValueExact();
        return Map.of("items",visible.stream().map(this::view).toList(),
            "categories",groups.stream().map(c->new CategoryView(c.getId(),c.getName(),c.getCategoryType(),
                visible.stream().filter(m->m.getCategory().getId().equals(c.getId())).count())).toList(),
            "stats",Map.of("total",sold.size(),"selling",sold.stream().filter(MenuItem::isSellable).count(),
                "unavailable",sold.stream().filter(m->MenuItem.UNAVAILABLE.equals(m.getAvailabilityStatus())).count(),
                "categoryCount",groups.stream().filter(c->!c.isType("SIZE")).count(),"averagePrice",avg));
    }
    private Category category(Long id) {
        Category c=categories.findById(id).orElseThrow(()->ApiException.badRequest("Danh mục không tồn tại."));
        if (!Category.ACTIVE.equals(c.getStatus())) throw ApiException.badRequest("Danh mục đã bị xoá.");
        if (c.isType("SIZE")) throw ApiException.badRequest("Size là lựa chọn gọi món, không thuộc Menu Management.");
        return c;
    }
    private MenuItem item(Long id) {
        MenuItem m=items.findById(id).orElseThrow(()->ApiException.badRequest("Món không tồn tại."));
        if (!active(m)) throw ApiException.badRequest("Món đã bị xoá.");
        if (m.getCategory().isType("SIZE")) throw ApiException.badRequest("Size không phải món bán riêng.");
        return m;
    }
    public CategoryView saveCategory(Long id, CategoryRequest req) {
        String name=req.name().trim();
        Category c=id==null?new Category():category(id);
        var duplicate=categories.findAll().stream().filter(x->x.getName().equalsIgnoreCase(name) && !Objects.equals(x.getId(),id)).findFirst();
        if (duplicate.isPresent()) throw ApiException.conflict("Tên danh mục đã tồn tại, kể cả danh mục đã xoá.");
        if (!Set.of("DRINK", "FOOD", "TOPPING").contains(req.categoryType())) throw ApiException.badRequest("Loại danh mục không hợp lệ.");
        c.setName(name); c.setCategoryType(req.categoryType()); categories.save(c);
        return new CategoryView(c.getId(),c.getName(),c.getCategoryType(),0);
    }
    public void deleteCategory(Long id) {
        Category c=category(id);
        if (items.findAll().stream().anyMatch(m->active(m) && m.getCategory().getId().equals(id)))
            throw ApiException.conflict("Danh mục còn món. Hãy chuyển hoặc xoá các món trước.");
        c.setStatus(Category.INACTIVE); categories.save(c);
    }
    public ManagedItemView saveItem(Long id, MenuRequest req) {
        Category c=category(req.categoryId()); String name=req.name().trim();
        MenuItem m=id==null?new MenuItem():item(id);
        if (items.findAll().stream().anyMatch(x->x.getCategory().getId().equals(c.getId()) && x.getName().equalsIgnoreCase(name) && !Objects.equals(x.getId(),id)))
            throw ApiException.conflict("Tên món đã tồn tại trong danh mục này, kể cả món đã xoá.");
        String image=req.imageUrl();
        if (image!=null && !image.isBlank() && !image.matches("/uploads/[a-z0-9-]+/[a-zA-Z0-9-]+\\.(jpg|jpeg|png|webp|gif)"))
            throw ApiException.badRequest("Vui lòng dùng ảnh tải lên từ hệ thống.");
        m.setCategory(c);m.setName(name);m.setBasePrice(req.basePrice());m.setDescription(req.description());
        m.setImageUrl(image==null||image.isBlank()?null:image);
        m.setSellStandalone(true);
        // Chỉ cập nhật menu: giá đã chụp trong order_items không bị thay đổi.
        return view(items.save(m));
    }
    public ManagedItemView availability(Long id, boolean available) {
        MenuItem m=item(id);m.setAvailabilityStatus(available?MenuItem.AVAILABLE:MenuItem.UNAVAILABLE);return view(items.save(m));
    }
    public void deleteItem(Long id) {
        MenuItem m=item(id);m.setAvailabilityStatus(MenuItem.INACTIVE);items.save(m);
    }
}
