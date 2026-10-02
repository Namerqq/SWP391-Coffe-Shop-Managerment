package com.example.project.controller;

import com.example.project.dto.MenuCategoryResponse;
import com.example.project.dto.OrderResponse;
import com.example.project.dto.PlaceOrderRequest;
import com.example.project.dto.TableInfoResponse;
import com.example.project.service.SelfOrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API công khai cho khách quét QR (không cần đăng nhập) - UC-CU01, UC-CU02, UC-CU03. */
@RestController
@RequestMapping("/api/public")
public class SelfOrderController {

    private final SelfOrderService service;

    public SelfOrderController(SelfOrderService service) {
        this.service = service;
    }

    @GetMapping("/tables/{qrCode}")
    public TableInfoResponse getTable(@PathVariable String qrCode) {
        return service.getTable(qrCode);
    }

    @GetMapping("/menu")
    public List<MenuCategoryResponse> getMenu() {
        return service.getMenu();
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> placeOrder(@Valid @RequestBody PlaceOrderRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.placeOrder(req));
    }
}
