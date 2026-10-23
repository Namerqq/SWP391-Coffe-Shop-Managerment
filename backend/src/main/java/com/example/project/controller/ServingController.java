package com.example.project.controller;

import com.example.project.dto.order.OrderView;
import com.example.project.dto.waiter.IncidentItemRequest;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.ServingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Theo dõi đơn & món chờ mang ra (Phục vụ) / Mang đi chờ giao (Thu ngân). */
@RestController
@RequestMapping("/api/serving")
@RequireRole({"WAITER", "CASHIER"})
public class ServingController {

    private final ServingService service;

    public ServingController(ServingService service) {
        this.service = service;
    }

    /** Đơn tại bàn còn món chờ pha / chờ mang ra (bảng của phục vụ). */
    @GetMapping("/board")
    @RequireRole("WAITER")
    public List<OrderView> board() {
        return service.waiterBoard();
    }

    /** Phục vụ tích đã mang 1 món ra bàn. Mang đủ món thì đơn tự sang Đã phục vụ. */
    @PatchMapping("/orders/{orderId}/items/{itemId}/served")
    @RequireRole("WAITER")
    public OrderView serveItem(@PathVariable Long orderId, @PathVariable Long itemId) {
        return service.serveItem(orderId, itemId);
    }

    /** Phục vụ báo sự cố làm vỡ / đổ món trước khi giao cho khách (lưu biên bản cho quản lý xem xét). */
    @PostMapping("/orders/{orderId}/items/{itemId}/incident")
    @RequireRole("WAITER")
    public OrderView reportIncident(@PathVariable Long orderId,
                                    @PathVariable Long itemId,
                                    @Valid @RequestBody IncidentItemRequest req,
                                    @RequestAttribute(AuthInterceptor.CURRENT_USER) User waiter) {
        return service.reportIncident(orderId, itemId, req, waiter);
    }

    /** type = DINE_IN (mặc định) hoặc PICKUP */
    @GetMapping("/ready")
    public List<OrderView> ready(@RequestParam(required = false) String type) {
        return service.readyOrders(type);
    }

    @PatchMapping("/orders/{id}/served")
    public OrderView served(@PathVariable Long id) {
        return service.markServed(id);
    }
}
