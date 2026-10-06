package com.example.project.controller;

import com.example.project.dto.inventory.*;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.InventoryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * UC-IV01 Manage Inventory Item — chỉ dành cho MANAGER.
 * Quản lý kho nguyên liệu: CRUD, nhập kho, xem lịch sử, lọc sắp hết.
 */
@RestController
@RequestMapping("/api/manager/inventory")
@RequireRole("MANAGER")
public class ManagerInventoryController {

    private final InventoryService service;

    public ManagerInventoryController(InventoryService service) {
        this.service = service;
    }

    /** Thống kê tổng quan kho (tổng, sắp hết, đủ). */
    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return service.stats();
    }

    /** Danh sách tất cả nguyên liệu đang hoạt động. */
    @GetMapping
    public List<InventoryItemView> list() {
        return service.listActive();
    }

    /** Danh sách nguyên liệu sắp hết / hết. */
    @GetMapping("/low-stock")
    public List<InventoryItemView> lowStock() {
        return service.listLowStock();
    }

    /** Chi tiết 1 nguyên liệu. */
    @GetMapping("/{id}")
    public InventoryItemView detail(@PathVariable Long id) {
        return service.getById(id);
    }

    /** Tạo mới nguyên liệu (+ giao dịch INITIAL nếu có openingQuantity). */
    @PostMapping
    public InventoryItemView create(@Valid @RequestBody InventoryItemRequest req, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return service.create(req, me);
    }

    /** Cập nhật thông tin nguyên liệu (không đổi số lượng tồn). */
    @PutMapping("/{id}")
    public InventoryItemView update(@PathVariable Long id, @Valid @RequestBody InventoryItemRequest req) {
        return service.update(id, req);
    }

    /** Nhập kho: tăng số lượng tồn + ghi lịch sử STOCK_IN. */
    @PostMapping("/{id}/stock-in")
    public InventoryItemView stockIn(@PathVariable Long id, @Valid @RequestBody StockInRequest req, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return service.stockIn(id, req, me);
    }

    /** Lịch sử nhập/xuất kho của 1 nguyên liệu. */
    @GetMapping("/{id}/history")
    public List<StockTransactionView> history(@PathVariable Long id) {
        return service.history(id);
    }
}
