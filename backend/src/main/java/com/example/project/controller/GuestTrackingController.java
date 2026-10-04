package com.example.project.controller;

import com.example.project.dto.guest.GuestCancelRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.service.GuestSessionStore;
import com.example.project.service.GuestTrackingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Khách theo dõi đơn của mình và hủy đơn còn Chờ pha (Order Tracking). */
@RestController
@RequestMapping("/api/public/order")
public class GuestTrackingController {

    private final GuestTrackingService service;

    public GuestTrackingController(GuestTrackingService service) {
        this.service = service;
    }

    @GetMapping("/orders")
    public List<OrderView> myOrders(@RequestHeader(value = GuestSessionStore.HEADER, required = false) String token) {
        return service.myOrders(token);
    }

    /** Body (không bắt buộc): { "reason": "Gọi nhầm món" } */
    @PostMapping("/orders/{id}/cancel")
    public OrderView cancel(@PathVariable Long id,
                            @Valid @RequestBody(required = false) GuestCancelRequest req,
                            @RequestHeader(value = GuestSessionStore.HEADER, required = false) String token) {
        return service.cancel(token, id, req == null ? null : req.reason());
    }
}
