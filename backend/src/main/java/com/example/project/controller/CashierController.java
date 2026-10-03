package com.example.project.controller;

import com.example.project.dto.cashier.CustomerCreateRequest;
import com.example.project.dto.order.CustomerView;
import com.example.project.security.RequireRole;
import com.example.project.service.CashierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Màn hình Thu ngân. Sơ đồ bàn / chi tiết bàn dùng API chung /api/staff/tables (StaffController),
 * menu gọi món dùng /api/staff/menu.
 */
@RestController
@RequestMapping("/api/cashier")
@RequireRole("CASHIER")
public class CashierController {

    private final CashierService service;

    public CashierController(CashierService service) {
        this.service = service;
    }

    /** UC-C10: tìm khách theo số điện thoại. Không có -> 404. */
    @GetMapping("/customers")
    public CustomerView findCustomer(@RequestParam String phone) {
        return service.findCustomer(phone);
    }

    /** UC-C13: đăng ký khách thân thiết. Body: { "phoneNumber": "0901234567", "fullName": "An" } */
    @PostMapping("/customers")
    public ResponseEntity<CustomerView> createCustomer(@Valid @RequestBody CustomerCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCustomer(req));
    }

}
