package com.example.project.controller;

import com.example.project.dto.cashier.CustomerUpdateRequest;
import com.example.project.dto.cashier.LoyaltyCustomerPage;
import com.example.project.dto.cashier.LoyaltyCustomerRow;
import com.example.project.dto.cashier.LoyaltyHistoryView;
import com.example.project.security.RequireRole;
import com.example.project.service.LoyaltyCustomerService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * Màn Khách thân thiết của Thu ngân (ThangNN Iter3) — SRS 1.3.7, UC-C12 Manage Customer Loyalty.
 * Tìm 1 khách theo SĐT (UC-C10) và đăng ký khách mới (UC-C13) dùng lại GET / POST /api/cashier/customers.
 */
@RestController
@RequestMapping("/api/cashier/loyalty-customers")
@RequireRole("CASHIER")
public class CashierLoyaltyController {

    private final LoyaltyCustomerService service;

    public CashierLoyaltyController(LoyaltyCustomerService service) {
        this.service = service;
    }

    /**
     * Danh sách khách thân thiết.
     * GET /api/cashier/loyalty-customers?keyword=0901&sort=points&page=0&size=20
     * keyword = 1 phần SĐT hoặc tên; sort = recent (mặc định) | points | name; page bắt đầu từ 0.
     */
    @GetMapping
    public LoyaltyCustomerPage list(@RequestParam(required = false) String keyword,
                                    @RequestParam(required = false) String sort,
                                    @RequestParam(required = false) Integer page,
                                    @RequestParam(required = false) Integer size) {
        return service.list(keyword, sort, page, size);
    }

    /** Lịch sử điểm của 1 khách. GET /api/cashier/loyalty-customers/3/history */
    @GetMapping("/{id}/history")
    public LoyaltyHistoryView history(@PathVariable Long id) {
        return service.history(id);
    }

    /** Sửa tên khách (SĐT không sửa được). PUT /api/cashier/loyalty-customers/3  Body: { "fullName": "An" } */
    @PutMapping("/{id}")
    public LoyaltyCustomerRow update(@PathVariable Long id, @Valid @RequestBody CustomerUpdateRequest req) {
        return service.update(id, req);
    }
}
