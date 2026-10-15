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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.example.project.dto.inventory.InventoryItemRequest;
import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.entity.StockTransaction;

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

    @Test
    @DisplayName("TC1: Tạo nguyên liệu mới thành công và ghi nhận giao dịch INITIAL")
    void create_Success_WithOpeningQuantity() {
        // GIVEN: Nguyên liệu chưa từng tồn tại trong hệ thống
        when(itemRepo.existsByItemNameIgnoreCase("Hạt cà phê Arabica")).thenReturn(false);

        InventoryItemRequest req = new InventoryItemRequest(
                "Hạt cà phê Arabica",
                "kg",
                new BigDecimal("5.000"),
                250000L,
                new BigDecimal("10.000")
        );

        // WHEN: Quản lý thực hiện tạo nguyên liệu
        var result = inventoryService.create(req, sampleManager);

        // THEN: Các thông tin phải chính xác và được lưu vào Database
        assertEquals("Hạt cà phê Arabica", result.itemName());
        assertEquals("kg", result.unit());
        assertEquals(new BigDecimal("10.000"), result.currentQuantity());
        assertEquals(new BigDecimal("5.000"), result.minimumStockLevel());
        assertEquals(250000L, result.unitCost());

        // Kiểm tra lệnh lưu: phải lưu nguyên liệu và tạo 1 giao dịch tồn đầu kỳ INITIAL
        org.mockito.Mockito.verify(itemRepo, org.mockito.Mockito.times(1))
                .save(org.mockito.ArgumentMatchers.any(InventoryItem.class));
        org.mockito.Mockito.verify(txRepo, org.mockito.Mockito.times(1))
                .save(org.mockito.ArgumentMatchers.any(com.example.project.entity.StockTransaction.class));
    }

    @Test
    @DisplayName("TC2: Bắt lỗi 409 Conflict khi tạo nguyên liệu trùng tên")
    void create_ThrowsConflict_WhenItemNameExists() {
        // GIVEN: Tên nguyên liệu đã có sẵn trong cơ sở dữ liệu
        when(itemRepo.existsByItemNameIgnoreCase("Hạt cà phê Robusta")).thenReturn(true);

        InventoryItemRequest req = new InventoryItemRequest(
                "Hạt cà phê Robusta",
                "kg",
                new BigDecimal("5.000"),
                200000L,
                BigDecimal.ZERO
        );

        // WHEN & THEN: Gọi hàm create phải ném ra ApiException với HttpStatus.CONFLICT
        com.example.project.exception.ApiException ex = assertThrows(
                com.example.project.exception.ApiException.class,
                () -> inventoryService.create(req, sampleManager)
        );

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã tồn tại"));

        // Xác minh không có lệnh lưu nào được thực hiện
        verify(itemRepo, never()).save(any(InventoryItem.class));
        verify(txRepo, never()).save(any(StockTransaction.class));
    }
}
