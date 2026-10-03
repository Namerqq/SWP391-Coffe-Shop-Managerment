package com.example.project.controller;

import com.example.project.dto.order.OrderItemRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.waiter.CancelOrderRequest;
import com.example.project.security.RequireRole;
import com.example.project.service.WaiterService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * Màn hình Phục vụ: sửa / bỏ món, hủy đơn còn chờ pha.
 * Sơ đồ bàn và chi tiết bàn dùng API chung /api/staff/tables (StaffController).
 */
@RestController
@RequestMapping("/api/waiter")
@RequireRole("WAITER")
public class WaiterController {

    private final WaiterService service;

    public WaiterController(WaiterService service) {
        this.service = service;
    }

    @PutMapping("/orders/{orderId}/items/{itemId}")
    public OrderView updateItem(@PathVariable Long orderId, @PathVariable Long itemId,
                                @Valid @RequestBody OrderItemRequest req) {
        return service.updateItem(orderId, itemId, req);
    }

    @DeleteMapping("/orders/{orderId}/items/{itemId}")
    public OrderView removeItem(@PathVariable Long orderId, @PathVariable Long itemId) {
        return service.removeItem(orderId, itemId);
    }

    /** Body (không bắt buộc): { "reason": "Khách đổi ý" } */
    @PatchMapping("/orders/{orderId}/cancel")
    public OrderView cancel(@PathVariable Long orderId,
                            @Valid @RequestBody(required = false) CancelOrderRequest req) {
        return service.cancel(orderId, req == null ? null : req.reason());
    }
}
