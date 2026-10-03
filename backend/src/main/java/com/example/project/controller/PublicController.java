package com.example.project.controller;

import com.example.project.dto.order.MenuCategoryView;
import com.example.project.service.MenuCatalogService;
import com.example.project.service.SystemSettingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** API công khai cho trang khách hàng (không cần đăng nhập). */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final SystemSettingService settings;
    private final MenuCatalogService menuCatalogService;

    public PublicController(SystemSettingService settings, MenuCatalogService menuCatalogService) {
        this.settings = settings;
        this.menuCatalogService = menuCatalogService;
    }

    /** Nội dung trang chủ (cấu hình nhóm HOME do Admin chỉnh): { "home.hero1.title": "...", ... } */
    @GetMapping("/home")
    public Map<String, String> home() {
        return settings.getGroupValues("HOME");
    }

    /** Thực đơn đang bán (chỉ xem). */
    @GetMapping("/menu")
    public List<MenuCategoryView> menu() {
        return menuCatalogService.sellableMenu();
    }
}
