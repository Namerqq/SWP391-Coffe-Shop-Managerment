package com.example.project.controller;

import com.example.project.dto.barista.RecipeView;
import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.waiter.CancelOrderRequest;
import com.example.project.security.RequireRole;
import com.example.project.service.BaristaService;
import com.example.project.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Màn hình Pha chế: bảng đơn cần pha, chi tiết đơn, đổi trạng thái, công thức, xem kho. */
@RestController
@RequestMapping("/api/barista")
@RequireRole("BARISTA")
public class BaristaController {

    private final BaristaService service;
    private final InventoryService inventoryService;

    public BaristaController(BaristaService service, InventoryService inventoryService) {
        this.service = service;
        this.inventoryService = inventoryService;
    }

    // ===== UC-B04: View Inventory (read-only) =====

    /** Danh sách tất cả nguyên liệu (read-only cho Barista). */
    @GetMapping("/inventory")
    public List<InventoryItemView> inventory() {
        return inventoryService.listActive();
    }

    /** Danh sách nguyên liệu sắp hết (read-only cho Barista). */
    @GetMapping("/inventory/low-stock")
    public List<InventoryItemView> inventoryLowStock() {
        return inventoryService.listLowStock();
    }

    @GetMapping("/orders")
    public List<OrderView> board() {
        return service.board();
    }

    @GetMapping("/orders/{id}")
    public OrderView detail(@PathVariable Long id) {
        return service.detail(id);
    }

    @PatchMapping("/orders/{id}/start")
    public OrderView start(@PathVariable Long id) {
        return service.start(id);
    }

    @PatchMapping("/orders/{id}/ready")
    public OrderView ready(@PathVariable Long id) {
        return service.ready(id);
    }

    /** Body: { "reason": "Hết sữa tươi" } (bắt buộc). */
    @PatchMapping("/orders/{id}/cancel")
    public OrderView cancel(@PathVariable Long id, @Valid @RequestBody CancelOrderRequest req) {
        return service.cancelOutOfStock(id, req.reason());
    }

    @GetMapping("/recipes/{menuItemId}")
    public RecipeView recipe(@PathVariable Long menuItemId) {
        return service.recipe(menuItemId);
    }
}
