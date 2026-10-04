package com.example.project.controller;

import com.example.project.dto.assist.AssistOrderRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.TableOrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Assist Order (Waiter) — UC-W01 Place Assisted Orders.
 * Menu và danh sách bàn dùng API chung /api/staff/menu, /api/staff/tables.
 */
@RestController
@RequestMapping("/api/waiter/assist-orders")
@RequireRole("WAITER")
public class AssistOrderController {

    private final TableOrderService tableOrders;

    public AssistOrderController(TableOrderService tableOrders) {
        this.tableOrders = tableOrders;
    }

    @PostMapping
    public ResponseEntity<OrderView> create(@Valid @RequestBody AssistOrderRequest req,
                                            @RequestAttribute(AuthInterceptor.CURRENT_USER) User waiter) {
        Long id = tableOrders.createDineIn(req.tableId(), req.items(), req.note(), waiter);
        return ResponseEntity.status(HttpStatus.CREATED).body(tableOrders.view(id));
    }
}
