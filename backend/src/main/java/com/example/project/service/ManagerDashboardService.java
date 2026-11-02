package com.example.project.service;

import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.dto.inventory.StockReceiptView;
import com.example.project.dto.manager.ManagerDashboardView;
import com.example.project.dto.order.TableBoardItem;
import com.example.project.dto.revenue.RevenueReportView;
import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import com.example.project.entity.StockReceipt;
import com.example.project.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service tổng hợp dữ liệu cho Manager Dashboard:
 * UC-RP01 View Order Statistics; UC-RP02 View Revenue Report; UC-IV03 View Low Stock Alert; UC-B05 Shortage Reports.
 */
@Service
public class ManagerDashboardService {

    private final RevenueService revenueService;
    private final TableBoardService tableBoardService;
    private final MenuItemRepository menuItemRepository;
    private final InventoryService inventoryService;
    private final LowStockCheckingJob lowStockCheckingJob;
    private final StockReceiptService stockReceiptService;

    public ManagerDashboardService(RevenueService revenueService,
                                   TableBoardService tableBoardService,
                                   MenuItemRepository menuItemRepository,
                                   InventoryService inventoryService,
                                   LowStockCheckingJob lowStockCheckingJob,
                                   StockReceiptService stockReceiptService) {
        this.revenueService = revenueService;
        this.tableBoardService = tableBoardService;
        this.menuItemRepository = menuItemRepository;
        this.inventoryService = inventoryService;
        this.lowStockCheckingJob = lowStockCheckingJob;
        this.stockReceiptService = stockReceiptService;
    }

    @Transactional(readOnly = true)
    public ManagerDashboardView getDashboardSummary() {
        // 1. Doanh thu & Hóa đơn hôm nay
        long todayRevenue = 0;
        int todayInvoices = 0;
        long yesterdayRevenue = 0;
        try {
            RevenueReportView todayReport = revenueService.report(RevenueService.DAY, LocalDate.now());
            if (todayReport != null && todayReport.summary() != null) {
                todayRevenue = todayReport.summary().total();
                todayInvoices = todayReport.summary().billCount();
                yesterdayRevenue = todayReport.summary().previousTotal();
            }
        } catch (Exception ignored) {
            // Trường hợp dữ liệu doanh thu mới khởi tạo
        }

        // 2. Sơ đồ bàn đang có khách (Occupied tables)
        List<TableBoardItem> tables = tableBoardService.board();
        int totalTables = tables.size();
        int occupiedTables = (int) tables.stream().filter(t -> t.sessionId() != null).count();

        // 3. Món đang mở bán (Active menu items)
        List<MenuItem> allMenuItems = menuItemRepository.findAll();
        long totalMenuItems = allMenuItems.stream()
                .filter(m -> m.getCategory() != null && Category.ACTIVE.equals(m.getCategory().getStatus()))
                .count();
        long activeMenuItems = allMenuItems.stream()
                .filter(m -> m.getCategory() != null && Category.ACTIVE.equals(m.getCategory().getStatus()))
                .filter(m -> MenuItem.AVAILABLE.equals(m.getAvailabilityStatus()))
                .count();

        // 4. Cảnh báo nguyên liệu sắp hết (Low-stock summary)
        Map<String, Object> invStats = inventoryService.stats();
        long totalInventory = ((Number) invStats.getOrDefault("total", 0L)).longValue();
        long lowStockCount = ((Number) invStats.getOrDefault("lowStock", 0L)).longValue();
        long safeStockCount = ((Number) invStats.getOrDefault("ok", 0L)).longValue();

        LowStockCheckingJob.LowStockSnapshot snapshot = lowStockCheckingJob.getLatestSnapshot();
        List<InventoryItemView> lowStockItems;
        LocalDateTime lastCheckedAt;
        if (snapshot != null && snapshot.checkedAt() != null) {
            lowStockItems = snapshot.lowStockItems();
            lastCheckedAt = snapshot.checkedAt();
            lowStockCount = snapshot.totalAlertCount();
        } else {
            lowStockItems = inventoryService.listLowStock();
            lastCheckedAt = LocalDateTime.now();
        }

        // 5. Yêu cầu thiếu nguyên liệu từ quầy pha chế (Barista shortage reports - DRAFT receipts)
        List<StockReceiptView> draftReceipts = stockReceiptService.list(StockReceipt.DRAFT, null);
        long pendingShortageCount = draftReceipts.size();

        return new ManagerDashboardView(
                todayRevenue,
                todayInvoices,
                yesterdayRevenue,
                occupiedTables,
                totalTables,
                activeMenuItems,
                totalMenuItems,
                totalInventory,
                lowStockCount,
                safeStockCount,
                lowStockItems,
                lastCheckedAt,
                pendingShortageCount,
                draftReceipts
        );
    }
}
