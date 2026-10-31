package com.example.project.controller;

import com.example.project.dto.refund.RefundReportView;
import com.example.project.security.RequireRole;
import com.example.project.service.RefundService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** Quản lý hậu kiểm hoàn tiền (ThangNN Iter3): chỉ xem ai hoàn, bao nhiêu, lý do gì. */
@RestController
@RequestMapping("/api/manager/refunds")
@RequireRole("MANAGER")
public class ManagerRefundController {

    private final RefundService service;

    public ManagerRefundController(RefundService service) {
        this.service = service;
    }

    /** GET /api/manager/refunds?from=2026-10-25&to=2026-10-31 (bỏ trống = 7 ngày gần nhất). */
    @GetMapping
    public RefundReportView report(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.report(from, to);
    }
}
