package com.example.project.controller;

import com.example.project.dto.barista.ItemCheckRequest;
import com.example.project.dto.barista.ItemsDoneRequest;
import com.example.project.dto.barista.RecipeView;
import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.dto.order.OrderView;
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

    /**
     * Tích / bỏ tích 1 món đã pha xong. Body: { "done": true }.
     * Món tích xong sang Chờ mang ra ngay; đơn tự đổi trạng thái theo các món (không có API báo xong cả đơn).
     */
    @PatchMapping("/orders/{orderId}/items/{itemId}")
    public OrderView checkItem(@PathVariable Long orderId, @PathVariable Long itemId,
                               @Valid @RequestBody ItemCheckRequest req) {
        return service.checkItem(orderId, itemId, req.done());
    }

    /** Tích xong nhiều món một lần ("Tổng cần pha"). Body: { "itemIds": [3, 7, 9] }. Trả về bảng pha chế mới. */
    @PatchMapping("/items/done")
    public List<OrderView> checkItems(@Valid @RequestBody ItemsDoneRequest req) {
        return service.checkItems(req.itemIds());
    }

    /** BF-02: hết nguyên liệu -> hủy 1 món còn chờ pha (hủy hết món thì đơn tự hủy). */
    @PatchMapping("/orders/{orderId}/items/{itemId}/cancel")
    public OrderView cancelItem(@PathVariable Long orderId, @PathVariable Long itemId) {
        return service.cancelItem(orderId, itemId);
    }

    @GetMapping("/recipes/{menuItemId}")
    public RecipeView recipe(@PathVariable Long menuItemId) {
        return service.recipe(menuItemId);
    }
}
