package com.example.project.controller;

import com.example.project.dto.barista.ItemCheckRequest;
import com.example.project.dto.barista.RecipeView;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.waiter.CancelOrderRequest;
import com.example.project.security.RequireRole;
import com.example.project.service.BaristaService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Màn hình Pha chế: bảng đơn cần pha, chi tiết đơn, đổi trạng thái, công thức. */
@RestController
@RequestMapping("/api/barista")
@RequireRole("BARISTA")
public class BaristaController {

    private final BaristaService service;

    public BaristaController(BaristaService service) {
        this.service = service;
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

    /** Tích / bỏ tích 1 món đã pha xong. Body: { "done": true }. Tích đủ mọi món thì đơn tự sang Chờ mang ra. */
    @PatchMapping("/orders/{orderId}/items/{itemId}")
    public OrderView checkItem(@PathVariable Long orderId, @PathVariable Long itemId,
                               @Valid @RequestBody ItemCheckRequest req) {
        return service.checkItem(orderId, itemId, req.done());
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
