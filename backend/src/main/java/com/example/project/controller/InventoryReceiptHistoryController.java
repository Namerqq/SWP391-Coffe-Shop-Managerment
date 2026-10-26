package com.example.project.controller;

import com.example.project.dto.inventory.IngredientSingleDayReceiptHistoryView;
import com.example.project.security.RequireRole;
import com.example.project.service.InventoryService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Endpoint tra cứu lịch sử nhập kho theo từng nguyên liệu (Single Day View).
 * URL: GET /api/inventory/receipt-history?ingredientId={id}&date={YYYY-MM-DD}
 */
@RestController
@RequestMapping("/api/inventory/receipt-history")
@RequireRole({"MANAGER", "ADMIN"})
public class InventoryReceiptHistoryController {

    private final InventoryService service;

    public InventoryReceiptHistoryController(InventoryService service) {
        this.service = service;
    }

    @GetMapping
    public IngredientSingleDayReceiptHistoryView getReceiptHistory(
            @RequestParam Long ingredientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        return service.getSingleDayReceiptHistory(ingredientId, date);
    }
}
