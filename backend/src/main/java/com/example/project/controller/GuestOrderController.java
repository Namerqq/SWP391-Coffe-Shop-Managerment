package com.example.project.controller;

import com.example.project.dto.guest.GuestOrderRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.service.GuestOrderService;
import com.example.project.service.GuestSessionStore;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Khách gửi đơn từ giỏ hàng (Cart & Confirm Order). */
@RestController
@RequestMapping("/api/public/order")
public class GuestOrderController {

    private final GuestOrderService service;

    public GuestOrderController(GuestOrderService service) {
        this.service = service;
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderView> place(@Valid @RequestBody GuestOrderRequest req,
                                           @RequestHeader(value = GuestSessionStore.HEADER, required = false) String token) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.placeOrder(token, req));
    }
}
