package com.example.project.controller;

import com.example.project.dto.cashier.CustomerCreateRequest;
import com.example.project.dto.cashier.PayRequest;
import com.example.project.dto.cashier.PaymentResult;
import com.example.project.dto.cashier.PaymentSettingsView;
import com.example.project.dto.cashier.ReceiptView;
import com.example.project.dto.cashier.TakeawayRequest;
import com.example.project.dto.order.CustomerView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
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

    @GetMapping("/payment-settings")
    public PaymentSettingsView paymentSettings() {
        return service.paymentSettings();
    }

    /** Thanh toán bàn. Body: { "method": "CASH", "customerId": 3, "pointsToRedeem": 10 } */
    @PostMapping("/sessions/{sessionId}/pay")
    public PaymentResult paySession(@PathVariable Long sessionId, @Valid @RequestBody PayRequest req,
                                    @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.paySession(sessionId, req, cashier);
    }

    /** Bán mang đi: tạo đơn + thu tiền cùng lúc. */
    @PostMapping("/takeaway")
    public PaymentResult takeaway(@Valid @RequestBody TakeawayRequest req,
                                  @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.takeaway(req, cashier);
    }

    @GetMapping("/payments/{paymentId}/receipt")
    public ReceiptView receipt(@PathVariable Long paymentId) {
        return service.receipt(paymentId);
    }
}
