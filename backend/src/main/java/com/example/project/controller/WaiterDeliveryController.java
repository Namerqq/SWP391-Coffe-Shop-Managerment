package com.example.project.controller;

import com.example.project.dto.delivery.FailDeliveryRequest;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.DeliveryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Phục vụ đi giao đơn online (Iter 3): xem đơn mình được gán, bấm nhận hàng / đã thu tiền COD / đã giao /
 * giao không thành công.
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

    /** UC-W10 Đã thu tiền COD (đơn trả tiền mặt khi nhận hàng). PUT /api/waiter/deliveries/12/confirm-cod */
    @PutMapping("/{orderId}/confirm-cod")
    public OnlineOrderView confirmCod(@PathVariable Long orderId,
                                      @RequestAttribute(AuthInterceptor.CURRENT_USER) User me) {
        return deliveryService.confirmCod(orderId, me);
    }

    /** Đã giao (đơn COD phải thu tiền trước). PUT /api/waiter/deliveries/12/deliver */
    @PutMapping("/{orderId}/deliver")
    public OnlineOrderView deliver(@PathVariable Long orderId,
                                   @RequestAttribute(AuthInterceptor.CURRENT_USER) User me) {
        return deliveryService.deliver(orderId, me.getId());
    }

    /** Giao không thành công. PUT /api/waiter/deliveries/12/fail  body { "reason": "Khách không nghe máy" } */
    @PutMapping("/{orderId}/fail")
    public OnlineOrderView fail(@PathVariable Long orderId, @Valid @RequestBody FailDeliveryRequest req,
                                @RequestAttribute(AuthInterceptor.CURRENT_USER) User me) {
        return deliveryService.fail(orderId, me.getId(), req.reason());
    }
}
