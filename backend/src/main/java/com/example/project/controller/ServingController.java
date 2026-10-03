package com.example.project.controller;

import com.example.project.dto.order.OrderView;
import com.example.project.security.RequireRole;
import com.example.project.service.ServingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Món chờ mang ra (Phục vụ) / Mang đi chờ giao (Thu ngân). */
@RestController
@RequestMapping("/api/serving")
@RequireRole({"WAITER", "CASHIER"})
public class ServingController {

    private final ServingService service;

    public ServingController(ServingService service) {
        this.service = service;
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
