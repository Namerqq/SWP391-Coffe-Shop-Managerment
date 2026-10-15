package com.example.project.service;

import com.example.project.entity.InventoryItem;
import com.example.project.entity.User;
import com.example.project.repository.InventoryItemRepository;
import com.example.project.repository.StockTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Unit Test cho InventoryService sử dụng JUnit 5 và Mockito.
 * Giả lập tầng Repository để kiểm thử logic xử lý kho độc lập và nhanh chóng.
 */
@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryItemRepository itemRepo;

    @Mock
    private StockTransactionRepository txRepo;

    @InjectMocks
    private InventoryService inventoryService;

    private User sampleManager;
    private InventoryItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleManager = new User();
        sampleManager.setUsername("manager01");
        sampleManager.setFullName("Lê Quản Lý");

        sampleItem = new InventoryItem();
        sampleItem.setItemName("Hạt cà phê Robusta");
        sampleItem.setUnit("kg");
        sampleItem.setCurrentQuantity(new BigDecimal("10.000"));
        sampleItem.setMinimumStockLevel(new BigDecimal("5.000"));
        sampleItem.setUnitCost(200000L);
        sampleItem.setStatus(InventoryItem.ACTIVE);
    }

    @Test
    @DisplayName("Khởi tạo service và các mock thành công")
    void shouldInitializeServiceSuccessfully() {
        assertNotNull(inventoryService, "InventoryService phải được khởi tạo cùng các mock repository");
        assertNotNull(sampleManager, "Sample manager phải được thiết lập");
        assertNotNull(sampleItem, "Sample item phải được thiết lập");
    }
}
