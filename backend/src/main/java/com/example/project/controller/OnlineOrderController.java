package com.example.project.controller;

import com.example.project.dto.guest.GuestCancelRequest;
import com.example.project.dto.online.OnlineOrderRequest;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.service.OnlineOrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho khách đặt đơn online (UC-CU05 Place Online Order).
 * Endpoint public không yêu cầu đăng nhập.
 */
@RestController
@RequestMapping("/api/public/online")
public class OnlineOrderController {

    private final OnlineOrderService onlineOrderService;

    public OnlineOrderController(OnlineOrderService onlineOrderService) {
        this.onlineOrderService = onlineOrderService;
    }

    /**
     * Gửi đơn đặt hàng online (COD hoặc QR).
     * POST /api/public/online/orders
     */
    @PostMapping("/orders")
    public ResponseEntity<OnlineOrderView> placeOrder(@Valid @RequestBody OnlineOrderRequest req) {
        OnlineOrderView view = onlineOrderService.placeOrder(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(view);
    }

    /**
     * Xem chi tiết đơn hàng online để theo dõi trạng thái.
     * GET /api/public/online/orders/{id}
     */
    @GetMapping("/orders/{id}")
    public ResponseEntity<OnlineOrderView> getOrderById(@PathVariable Long id) {
        OnlineOrderView view = onlineOrderService.getOrderById(id);
        return ResponseEntity.ok(view);
    }

    /**
     * Tra cứu danh sách lịch sử đơn hàng online theo số điện thoại.
     * GET /api/public/online/orders/by-phone?phone=...
     */
    @GetMapping("/orders/by-phone")
    public ResponseEntity<java.util.List<OnlineOrderView>> getOrdersByPhone(@RequestParam String phone) {
        return ResponseEntity.ok(onlineOrderService.getOrdersByPhone(phone));
    }

    /**
     * Khách hàng hủy đơn online (chỉ được hủy khi chưa bắt đầu pha chế hoặc chưa giao hàng).
     * POST /api/public/online/orders/{id}/cancel
     */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<OnlineOrderView> cancelOrder(
            @PathVariable Long id,
            @RequestBody(required = false) GuestCancelRequest req) {
        String reason = req != null ? req.reason() : null;
        OnlineOrderView view = onlineOrderService.cancelOrder(id, reason);
        return ResponseEntity.ok(view);
    }
}
