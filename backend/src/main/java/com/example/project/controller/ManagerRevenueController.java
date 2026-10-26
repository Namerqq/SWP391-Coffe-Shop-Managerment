package com.example.project.controller;

import com.example.project.dto.revenue.RevenueReportView;
import com.example.project.security.RequireRole;
import com.example.project.service.RevenueService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** UC-RP01 View Order Statistics: Quản lý xem doanh thu của quán. */
@RestController
@RequestMapping("/api/manager/revenue")
@RequireRole("MANAGER")
public class ManagerRevenueController {

    private final RevenueService service;

    public ManagerRevenueController(RevenueService service) {
        this.service = service;
    }

    /**
     * GET /api/manager/revenue?period=WEEK&date=2026-10-24
     * period = DAY | WEEK | MONTH | YEAR (bỏ trống = DAY); date = 1 ngày bất kỳ trong kỳ (bỏ trống = hôm nay; tương lai -> 400).
     */
    @GetMapping
    public RevenueReportView report(@RequestParam(required = false) String period,
                                    @RequestParam(required = false)
                                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.report(period, date);
    }
}
