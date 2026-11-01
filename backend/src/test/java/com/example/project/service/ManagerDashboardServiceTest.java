package com.example.project.service;

import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.dto.inventory.StockReceiptView;
import com.example.project.dto.manager.ManagerDashboardView;
import com.example.project.dto.order.TableBoardItem;
import com.example.project.dto.revenue.RevenueReportView;
import com.example.project.entity.Category;
import com.example.project.entity.InventoryItem;
import com.example.project.entity.MenuItem;
import com.example.project.entity.StockReceipt;
import com.example.project.repository.MenuItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test cho ManagerDashboardService (UC-RP01, UC-RP02, UC-IV03).
 */
class ManagerDashboardServiceTest {

    private RevenueService revenueService;
    private TableBoardService tableBoardService;
    private MenuItemRepository menuItemRepository;
    private InventoryService inventoryService;
    private LowStockCheckingJob lowStockCheckingJob;
    private StockReceiptService stockReceiptService;

    private ManagerDashboardService dashboardService;

    @BeforeEach
    void setUp() {
        revenueService = mock(RevenueService.class);
        tableBoardService = mock(TableBoardService.class);
        menuItemRepository = mock(MenuItemRepository.class);
        inventoryService = mock(InventoryService.class);
        lowStockCheckingJob = mock(LowStockCheckingJob.class);
        stockReceiptService = mock(StockReceiptService.class);

        dashboardService = new ManagerDashboardService(
                revenueService,
                tableBoardService,
                menuItemRepository,
                inventoryService,
                lowStockCheckingJob,
                stockReceiptService
        );
    }

    @Test
    void getDashboardSummary_AggregatesAllFiveSections() {
        // 1. Mock Revenue
        RevenueReportView.Summary revSummary = new RevenueReportView.Summary(
                12, 1500000L, 1000000L, 500000L, 125000L, 1200000L, 0L
        );
        RevenueReportView revReport = new RevenueReportView(
                "DAY", LocalDate.now(), LocalDate.now(), revSummary, List.of(), List.of()
        );
        when(revenueService.report(eq(RevenueService.DAY), any(LocalDate.class))).thenReturn(revReport);

        // 2. Mock Tables
        TableBoardItem t1 = new TableBoardItem(1L, "B01", 101L, "S01", LocalDateTime.now(), 1, 0, 0, 0, 0, 0, 50000, 0, 0);
        TableBoardItem t2 = new TableBoardItem(2L, "B02", null, null, null, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        TableBoardItem t3 = new TableBoardItem(3L, "B03", 102L, "S02", LocalDateTime.now(), 2, 0, 0, 0, 0, 0, 100000, 0, 0);
        when(tableBoardService.board()).thenReturn(List.of(t1, t2, t3));

        // 3. Mock Menu items
        Category cat = new Category();
        cat.setName("Cà phê");
        cat.setStatus(Category.ACTIVE);

        MenuItem m1 = new MenuItem();
        m1.setName("Cà phê đen");
        m1.setCategory(cat);
        m1.setAvailabilityStatus(MenuItem.AVAILABLE);

        MenuItem m2 = new MenuItem();
        m2.setName("Cà phê sữa");
        m2.setCategory(cat);
        m2.setAvailabilityStatus(MenuItem.UNAVAILABLE);

        when(menuItemRepository.findAll()).thenReturn(List.of(m1, m2));

        // 4. Mock Inventory & Low stock
        when(inventoryService.stats()).thenReturn(Map.of("total", 10L, "lowStock", 1L, "ok", 9L));
        InventoryItem lowItemEntity = new InventoryItem();
        lowItemEntity.setId(1L);
        lowItemEntity.setItemName("Bột Cacao");
        lowItemEntity.setUnit("g");
        lowItemEntity.setCurrentQuantity(new BigDecimal("100"));
        lowItemEntity.setMinimumStockLevel(new BigDecimal("500"));
        lowItemEntity.setUnitCost(50000L);
        lowItemEntity.setStatus(InventoryItem.ACTIVE);
        InventoryItemView lowItem = InventoryItemView.from(lowItemEntity);

        LowStockCheckingJob.LowStockSnapshot snapshot = new LowStockCheckingJob.LowStockSnapshot(
                LocalDateTime.now(), 1, List.of(lowItem)
        );
        when(lowStockCheckingJob.getLatestSnapshot()).thenReturn(snapshot);

        // 5. Mock Barista shortage draft receipts
        StockReceipt draftEntity = new StockReceipt();
        draftEntity.setReceiptCode("REC-SHORT-01");
        draftEntity.setSupplierName("Nhà cung cấp A");
        draftEntity.setStatus(StockReceipt.DRAFT);
        draftEntity.setReceiptDate(LocalDate.now());
        draftEntity.setTotalAmount(250000L);
        draftEntity.setNote("Quầy thiếu sữa");
        StockReceiptView draftReceipt = StockReceiptView.from(draftEntity);
        when(stockReceiptService.list(StockReceipt.DRAFT, null)).thenReturn(List.of(draftReceipt));

        // Execute
        ManagerDashboardView view = dashboardService.getDashboardSummary();

        // Verify
        assertNotNull(view);
        // Section 1: Revenue
        assertEquals(1500000L, view.todayRevenue());
        assertEquals(12, view.todayInvoices());
        assertEquals(1200000L, view.yesterdayRevenue());

        // Section 2: Tables
        assertEquals(2, view.occupiedTables());
        assertEquals(3, view.totalTables());

        // Section 3: Menu items
        assertEquals(1, view.activeMenuItems());
        assertEquals(2, view.totalMenuItems());

        // Section 4: Inventory & Low stock
        assertEquals(10L, view.totalInventoryItems());
        assertEquals(1L, view.lowStockCount());
        assertEquals(9L, view.safeStockCount());
        assertEquals(1, view.lowStockItems().size());
        assertEquals("Bột Cacao", view.lowStockItems().get(0).itemName());

        // Section 5: Barista shortage reports
        assertEquals(1L, view.pendingShortageCount());
        assertEquals(1, view.pendingShortageReports().size());
        assertEquals("REC-SHORT-01", view.pendingShortageReports().get(0).receiptCode());
    }
}
