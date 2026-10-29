package com.example.project.controller;

import com.example.project.dto.cashier.CancelItemRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.CashierItemService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/** Thu ngân thao tác trên món của đơn tại bàn lúc thanh toán (ThangNN Iter3). */
@RestController
@RequestMapping("/api/cashier/orders")
@RequireRole("CASHIER")
public class CashierOrderController {

    private final CashierItemService service;

    public CashierOrderController(CashierItemService service) {
        this.service = service;
    }

    /**
     * Bỏ 1 món chưa phục vụ khỏi đơn chưa thanh toán (khách không dùng nữa).
     * POST /api/cashier/orders/12/items/34/cancel   Body: { "reason": "Khách không dùng nữa", "expectedStatus": "READY" }
     * Món đã pha xong (READY) thì ghi thêm biên bản sự cố cho quản lý. Trả về đơn sau khi bỏ món.
     */
    @PostMapping("/{orderId}/items/{itemId}/cancel")
    public OrderView cancelItem(@PathVariable Long orderId, @PathVariable Long itemId,
                                @Valid @RequestBody(required = false) CancelItemRequest req,
                                @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.cancelUnservedItem(orderId, itemId, req, cashier);
    }
}
