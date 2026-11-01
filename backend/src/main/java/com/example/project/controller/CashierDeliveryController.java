package com.example.project.controller;

import com.example.project.dto.delivery.AssignWaiterRequest;
import com.example.project.dto.delivery.WaiterOptionView;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.security.RequireRole;
import com.example.project.service.DeliveryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Thu ngân gán phục vụ đi giao đơn online (Iter 3).
 * Tách khỏi CashierController để không sửa chung 1 file với phần thanh toán.
 */
@RestController
@RequestMapping("/api/cashier")
@RequireRole("CASHIER")
public class CashierDeliveryController {

    private final DeliveryService deliveryService;

    public CashierDeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    /** Chi tiết 1 đơn giao hàng. GET /api/cashier/delivery-orders/12 */
    @GetMapping("/delivery-orders/{id}")
    public OnlineOrderView deliveryOrder(@PathVariable Long id) {
        return deliveryService.getDeliveryOrder(id);
    }

    /** Phục vụ đang hoạt động + số đơn đang cầm. GET /api/cashier/waiters */
    @GetMapping("/waiters")
    public List<WaiterOptionView> waiters() {
        return deliveryService.listWaiters();
    }

    /** Gán hoặc đổi người giao. PUT /api/cashier/delivery-orders/12/assign  body { "waiterId": 5 } */
    @PutMapping("/delivery-orders/{id}/assign")
    public OnlineOrderView assign(@PathVariable Long id, @Valid @RequestBody AssignWaiterRequest req) {
        return deliveryService.assign(id, req.waiterId());
    }
}
