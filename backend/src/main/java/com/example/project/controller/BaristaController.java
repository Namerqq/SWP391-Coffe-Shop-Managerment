package com.example.project.controller;

import com.example.project.dto.barista.ItemCheckRequest;
import com.example.project.dto.barista.ItemsDoneRequest;
import com.example.project.dto.barista.RecipeView;
import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.dto.inventory.ShortageReportRequest;
import com.example.project.dto.inventory.StockReceiptView;
import com.example.project.dto.inventory.WasteReportRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.BaristaService;
import com.example.project.service.InventoryService;
import com.example.project.service.StockReceiptService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Màn hình Pha chế: bảng đơn cần pha, chi tiết đơn, đổi trạng thái,
 * nhận đơn tự trừ kho, công thức, xem kho, báo thiếu nguyên liệu, báo hao hụt.
 */
@RestController
@RequestMapping("/api/barista")
@RequireRole("BARISTA")
public class BaristaController {

    private final BaristaService service;
    private final InventoryService inventoryService;
    private final StockReceiptService stockReceiptService;

    public BaristaController(BaristaService service,
                             InventoryService inventoryService,
                             StockReceiptService stockReceiptService) {
        this.service = service;
        this.inventoryService = inventoryService;
        this.stockReceiptService = stockReceiptService;
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

    // ===== UC-B05: Báo thiếu nguyên liệu (Shortage Report -> DRAFT receipt) =====

    @PostMapping("/inventory/report-shortage")
    public StockReceiptView reportShortage(@Valid @RequestBody ShortageReportRequest req, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return stockReceiptService.createShortageReport(req, me);
    }

    // ===== UC-B06: Báo hao hụt / hư hỏng tại quầy (Waste) =====

    @PostMapping("/inventory/{id}/waste")
    public InventoryItemView reportWaste(@PathVariable Long id, @Valid @RequestBody WasteReportRequest req, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return inventoryService.waste(id, req, me);
    }

    // ===== Order Preparation Flow =====

    @GetMapping("/orders")
    public List<OrderView> board() {
        return service.board();
    }

    @GetMapping("/orders/{id}")
    public OrderView detail(@PathVariable Long id) {
        return service.detail(id);
    }

    /**
     * Tự động trừ nguyên liệu khi Barista bấm "Nhận đơn" (Order moves to PREPARING).
     */
    @PatchMapping("/orders/{orderId}/accept")
    public OrderView acceptOrder(@PathVariable Long orderId, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return service.acceptOrder(orderId, me);
    }

    /**
     * Tích / bỏ tích 1 món đã pha xong. Body: { "done": true }.
     * Tự động trừ nguyên liệu tồn kho nếu đơn chưa từng trừ.
     */
    @PatchMapping("/orders/{orderId}/items/{itemId}")
    public OrderView checkItem(@PathVariable Long orderId, @PathVariable Long itemId,
                               @Valid @RequestBody ItemCheckRequest req,
                               HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return service.checkItem(orderId, itemId, req.done(), me);
    }

    /** Tích xong nhiều món một lần ("Tổng cần pha"). Body: { "itemIds": [3, 7, 9] }. Trả về bảng pha chế mới. */
    @PatchMapping("/items/done")
    public List<OrderView> checkItems(@Valid @RequestBody ItemsDoneRequest req, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return service.checkItems(req.itemIds(), me);
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
