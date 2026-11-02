package com.example.project.controller;

import com.example.project.dto.manager.ManagerDashboardView;
import com.example.project.security.RequireRole;
import com.example.project.service.ManagerDashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller phục vụ màn hình Manager Dashboard (UC-RP01, UC-RP02, UC-IV03).
 */
@RestController
@RequestMapping("/api/manager/dashboard")
@RequireRole("MANAGER")
public class ManagerDashboardController {

    private final ManagerDashboardService dashboardService;

    public ManagerDashboardController(ManagerDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /** Lấy dữ liệu tổng quan toàn bộ cửa hàng cho Quản lý. */
    @GetMapping("/summary")
    public ManagerDashboardView getSummary() {
        return dashboardService.getDashboardSummary();
    }
}
