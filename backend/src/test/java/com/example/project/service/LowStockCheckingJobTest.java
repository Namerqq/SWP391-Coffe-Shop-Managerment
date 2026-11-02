package com.example.project.service;

import com.example.project.entity.InventoryItem;
import com.example.project.repository.InventoryItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test cho SRS Background Job #1: LowStockCheckingJob (UC-IV03).
 */
class LowStockCheckingJobTest {

    private InventoryItemRepository itemRepo;
    private LowStockCheckingJob job;

    @BeforeEach
    void setUp() {
        itemRepo = mock(InventoryItemRepository.class);
        job = new LowStockCheckingJob(itemRepo);
    }

    @Test
    void checkLowStock_WhenNoItemsLow_ReturnsEmptySnapshot() {
        when(itemRepo.findLowStock(InventoryItem.ACTIVE)).thenReturn(List.of());

        LowStockCheckingJob.LowStockSnapshot snapshot = job.checkLowStock();

        assertNotNull(snapshot);
        assertEquals(0, snapshot.totalAlertCount());
        assertTrue(snapshot.lowStockItems().isEmpty());
        assertNotNull(snapshot.checkedAt());
        verify(itemRepo, times(1)).findLowStock(InventoryItem.ACTIVE);
    }

    @Test
    void checkLowStock_WhenItemsLow_CapturesAlertsAndUpdatesSnapshot() {
        InventoryItem item1 = new InventoryItem();
        item1.setId(10L);
        item1.setItemName("Hạt Cà Phê Robusta");
        item1.setUnit("kg");
        item1.setCurrentQuantity(new BigDecimal("1.500"));
        item1.setMinimumStockLevel(new BigDecimal("5.000"));
        item1.setStatus(InventoryItem.ACTIVE);

        InventoryItem item2 = new InventoryItem();
        item2.setId(11L);
        item2.setItemName("Sữa Đặc Ngôi Sao");
        item2.setUnit("hộp");
        item2.setCurrentQuantity(new BigDecimal("2.000"));
        item2.setMinimumStockLevel(new BigDecimal("10.000"));
        item2.setStatus(InventoryItem.ACTIVE);

        when(itemRepo.findLowStock(InventoryItem.ACTIVE)).thenReturn(List.of(item1, item2));

        LowStockCheckingJob.LowStockSnapshot snapshot = job.checkLowStock();

        assertNotNull(snapshot);
        assertEquals(2, snapshot.totalAlertCount());
        assertEquals(2, snapshot.lowStockItems().size());
        assertEquals("Hạt Cà Phê Robusta", snapshot.lowStockItems().get(0).itemName());
        assertEquals(new BigDecimal("1.500"), snapshot.lowStockItems().get(0).currentQuantity());
        assertEquals("Sữa Đặc Ngôi Sao", snapshot.lowStockItems().get(1).itemName());

        // Snapshot được lưu lại trong job và có thể truy xuất lại
        LowStockCheckingJob.LowStockSnapshot cached = job.getLatestSnapshot();
        assertSame(snapshot, cached);
        verify(itemRepo, times(1)).findLowStock(InventoryItem.ACTIVE);
    }

    @Test
    void executeJob_DelegatesToCheckLowStock() {
        when(itemRepo.findLowStock(InventoryItem.ACTIVE)).thenReturn(List.of());

        job.executeJob();

        verify(itemRepo, times(1)).findLowStock(InventoryItem.ACTIVE);
    }
}
