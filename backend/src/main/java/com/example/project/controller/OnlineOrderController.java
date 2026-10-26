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
     * Xem chi tiết 1 đơn online bằng mã đơn (khách chỉ xem được đơn mình có mã).
     * GET /api/public/online/orders/code/261023-0008
     */
    @GetMapping("/orders/code/{code}")
    public ResponseEntity<OnlineOrderView> getOrderByCode(@PathVariable String code) {
        return ResponseEntity.ok(onlineOrderService.getOrderByCode(code));
    }

    /**
     * Khách hàng hủy đơn online theo mã đơn (chỉ được hủy khi chưa bắt đầu pha chế hoặc chưa giao hàng).
     * POST /api/public/online/orders/code/261023-0008/cancel
     */
    @PostMapping("/orders/code/{code}/cancel")
    public ResponseEntity<OnlineOrderView> cancelOrder(
            @PathVariable String code,
            @RequestBody(required = false) GuestCancelRequest req) {
        String reason = req != null ? req.reason() : null;
        OnlineOrderView view = onlineOrderService.cancelOrder(code, reason);
        return ResponseEntity.ok(view);
    }
}
