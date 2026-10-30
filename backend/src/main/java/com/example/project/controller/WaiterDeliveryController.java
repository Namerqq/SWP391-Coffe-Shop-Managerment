package com.example.project.controller;

import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.DeliveryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Phục vụ đi giao đơn online (Iter 3): xem đơn mình được gán, bấm nhận hàng đi giao.
 * Người bấm lấy từ phiên đăng nhập, chỉ thao tác được trên đơn gán cho chính mình.
 */
@RestController
@RequestMapping("/api/waiter/deliveries")
@RequireRole("WAITER")
public class WaiterDeliveryController {

    private final DeliveryService deliveryService;

    public WaiterDeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    /** Đơn mình đang cầm (đã gán, đang giao), cũ nhất trước. GET /api/waiter/deliveries */
    @GetMapping
    public List<OnlineOrderView> myDeliveries(@RequestAttribute(AuthInterceptor.CURRENT_USER) User me) {
        return deliveryService.myDeliveries(me.getId());
    }

    /** Nhận hàng đi giao. PUT /api/waiter/deliveries/12/pick-up */
    @PutMapping("/{orderId}/pick-up")
    public OnlineOrderView pickUp(@PathVariable Long orderId,
                                  @RequestAttribute(AuthInterceptor.CURRENT_USER) User me) {
        return deliveryService.pickUp(orderId, me.getId());
    }
}
