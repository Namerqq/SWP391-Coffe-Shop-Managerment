package com.example.project.dto.manager;

import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.dto.inventory.StockReceiptView;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO tổng hợp thông tin Dashboard Quản lý (UC-RP01, UC-RP02, UC-IV03, UC-B05).
 * Bao gồm 5 khối chỉ số chính theo đặc tả:
 * 1. Doanh thu & hóa đơn hôm nay
 * 2. Số bàn đang có khách (Occupied tables)
 * 3. Món đang mở bán (Active menu items)
 * 4. Danh sách cảnh báo nguyên liệu sắp hết (Low-stock list)
 * 5. Yêu cầu thiếu nguyên liệu từ quầy pha chế (Barista shortage reports)
 */
public record ManagerDashboardView(
        // 1. Doanh thu & Hóa đơn hôm nay
        long todayRevenue,
        int todayInvoices,
        long yesterdayRevenue,

        // 2. Sơ đồ bàn đang phục vụ
        int occupiedTables,
        int totalTables,

        // 3. Số món mở bán
        long activeMenuItems,
        long totalMenuItems,

        // 4. Cảnh báo kho nguyên liệu
        long totalInventoryItems,
        long lowStockCount,
        long safeStockCount,
        List<InventoryItemView> lowStockItems,
        LocalDateTime lowStockLastCheckedAt,

        // 5. Yêu cầu thiếu nguyên liệu từ quầy Barista
        long pendingShortageCount,
        List<StockReceiptView> pendingShortageReports
) {}
