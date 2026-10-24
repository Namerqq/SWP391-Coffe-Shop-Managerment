package com.example.project.service;

import com.example.project.entity.InventoryItem;
import com.example.project.entity.User;
import com.example.project.repository.InventoryItemRepository;
import com.example.project.repository.StockTransactionRepository;
import com.example.project.repository.UserRepository;
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
import com.example.project.dto.inventory.StockInRequest;
import com.example.project.dto.inventory.StockOutRequest;
import com.example.project.dto.inventory.WasteReportRequest;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.StockTransaction;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    @Mock
    private UserRepository userRepo;

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

    @Test
    @DisplayName("TC3: Nhập kho thành công, cộng dồn số tồn và tạo giao dịch STOCK_IN")
    void stockIn_Success_IncreasesQuantityAndCreatesTransaction() {
        // GIVEN: Nguyên liệu có sẵn với tồn hiện tại = 10.000 kg
        InventoryItem item = new InventoryItem();
        item.setItemName("Hạt cà phê Robusta");
        item.setUnit("kg");
        item.setCurrentQuantity(new BigDecimal("10.000"));
        item.setMinimumStockLevel(new BigDecimal("5.000"));
        when(itemRepo.findById(1L)).thenReturn(Optional.of(item));

        StockInRequest req = new StockInRequest(new BigDecimal("15.500"), "Nhập từ nhà cung cấp Vinamilk");

        // WHEN: Thực hiện nhập kho thêm 15.500 kg
        InventoryItemView result = inventoryService.stockIn(1L, req, sampleManager);

        // THEN: Số lượng tồn mới phải bằng 10.000 + 15.500 = 25.500 kg
        assertEquals(new BigDecimal("25.500"), result.currentQuantity());
        assertEquals(new BigDecimal("25.500"), item.getCurrentQuantity());

        // Xác minh có lưu 1 giao dịch loại STOCK_IN
        verify(txRepo, times(1)).save(argThat(tx ->
                tx.getInventoryItem().equals(item) &&
                tx.getCreatedBy().equals(sampleManager) &&
                StockTransaction.STOCK_IN.equals(tx.getTransactionType()) &&
                new BigDecimal("15.500").equals(tx.getQuantity()) &&
                "Nhập từ nhà cung cấp Vinamilk".equals(tx.getNote())
        ));
    }

    @Test
    @DisplayName("TC4: Bắt lỗi 404 ResourceNotFound khi nhập kho cho ID không tồn tại")
    void stockIn_ThrowsNotFound_WhenItemDoesNotExist() {
        // GIVEN: ID = 999 không tồn tại trong hệ thống
        when(itemRepo.findById(999L)).thenReturn(Optional.empty());

        StockInRequest req = new StockInRequest(new BigDecimal("10.000"), "Ghi chú nhập hàng");

        // WHEN & THEN: Gọi hàm stockIn phải ném ResourceNotFoundException
        com.example.project.exception.ResourceNotFoundException ex = assertThrows(
                com.example.project.exception.ResourceNotFoundException.class,
                () -> inventoryService.stockIn(999L, req, sampleManager)
        );

        assertTrue(ex.getMessage().contains("Không tìm thấy nguyên liệu #999"));
        verify(txRepo, never()).save(any(StockTransaction.class));
    }

    @Test
    @DisplayName("TC5: Cập nhật thông tin nguyên liệu thành công nhưng không được đổi số lượng tồn")
    void update_Success_DoesNotChangeCurrentQuantity() {
        // GIVEN: Nguyên liệu ban đầu có id = 1L và tồn kho = 10.000 kg
        InventoryItem existingItem = new InventoryItem();
        org.springframework.test.util.ReflectionTestUtils.setField(existingItem, "id", 1L);
        existingItem.setItemName("Hạt cà phê Robusta");
        existingItem.setUnit("kg");
        existingItem.setCurrentQuantity(new BigDecimal("10.000"));
        existingItem.setMinimumStockLevel(new BigDecimal("5.000"));
        existingItem.setUnitCost(200000L);

        when(itemRepo.findById(1L)).thenReturn(Optional.of(existingItem));
        when(itemRepo.findByItemNameIgnoreCase("Hạt cà phê Robusta Gold")).thenReturn(Optional.empty());

        // Quản lý truyền payload đổi tên, quy cách, đơn giá và cố tình gửi kèm openingQuantity = 999.000
        InventoryItemRequest req = new InventoryItemRequest(
                "Hạt cà phê Robusta Gold",
                "túi",
                new BigDecimal("8.000"),
                220000L,
                new BigDecimal("999.000")
        );

        // WHEN: Thực hiện gọi hàm update
        InventoryItemView result = inventoryService.update(1L, req);

        // THEN: Các thông tin mô tả được cập nhật
        assertEquals("Hạt cà phê Robusta Gold", result.itemName());
        assertEquals("túi", result.unit());
        assertEquals(new BigDecimal("8.000"), result.minimumStockLevel());
        assertEquals(220000L, result.unitCost());

        // QUAN TRỌNG NHẤT: Số lượng tồn kho vẫn phải giữ nguyên là 10.000 kg, không đổi thành 999
        assertEquals(new BigDecimal("10.000"), result.currentQuantity());
        assertEquals(new BigDecimal("10.000"), existingItem.getCurrentQuantity());
    }

    @Test
    @DisplayName("TC6: Lọc danh sách nguyên liệu sắp hết (currentQuantity <= minimumStockLevel)")
    void listLowStock_ReturnsOnlyItemsBelowMinimum() {
        // GIVEN: 1 nguyên liệu đang ở mức báo động (tồn 2 <= mức tối thiểu 5)
        InventoryItem lowStockItem = new InventoryItem();
        lowStockItem.setItemName("Bột Matcha");
        lowStockItem.setUnit("kg");
        lowStockItem.setCurrentQuantity(new BigDecimal("2.000"));
        lowStockItem.setMinimumStockLevel(new BigDecimal("5.000"));
        lowStockItem.setStatus(InventoryItem.ACTIVE);

        when(itemRepo.findLowStock(InventoryItem.ACTIVE)).thenReturn(List.of(lowStockItem));

        // WHEN: Gọi hàm lấy danh sách sắp hết
        List<InventoryItemView> result = inventoryService.listLowStock();

        // THEN: Kết quả phải có đúng 1 món và có cờ lowStock = true
        assertEquals(1, result.size());
        assertEquals("Bột Matcha", result.get(0).itemName());
        assertTrue(result.get(0).lowStock());
    }

    @Test
    @DisplayName("TC7: Tính toán đúng các chỉ số thống kê Dashboard (Tổng, Sắp hết, Đủ dùng)")
    void stats_CalculatesCorrectSummary() {
        // GIVEN: 3 nguyên liệu: 1 món sắp hết (tồn 2 <= 5) và 2 món đủ dùng (tồn 10 > 5, tồn 20 > 5)
        InventoryItem item1 = new InventoryItem();
        item1.setCurrentQuantity(new BigDecimal("2.000"));
        item1.setMinimumStockLevel(new BigDecimal("5.000")); // isLowStock = true

        InventoryItem item2 = new InventoryItem();
        item2.setCurrentQuantity(new BigDecimal("10.000"));
        item2.setMinimumStockLevel(new BigDecimal("5.000")); // isLowStock = false

        InventoryItem item3 = new InventoryItem();
        item3.setCurrentQuantity(new BigDecimal("20.000"));
        item3.setMinimumStockLevel(new BigDecimal("5.000")); // isLowStock = false

        when(itemRepo.findAllByStatusOrderByItemNameAsc(InventoryItem.ACTIVE))
                .thenReturn(List.of(item1, item2, item3));

        // WHEN: Gọi hàm stats
        Map<String, Object> stats = inventoryService.stats();

        // THEN: total = 3, lowStock = 1, ok = 2
        assertEquals(3L, stats.get("total"));
        assertEquals(1L, stats.get("lowStock"));
        assertEquals(2L, stats.get("ok"));
    }

    @Test
    @DisplayName("TC8: Giảm / xuất kho thành công (ADJUSTMENT do nhập sai số liệu)")
    void stockOut_Success_DecreasesQuantityAndCreatesTransaction() {
        // GIVEN: Nguyên liệu có sẵn với tồn kho ban đầu = 20.000 kg
        InventoryItem item = new InventoryItem();
        item.setItemName("Hạt cà phê Robusta");
        item.setUnit("kg");
        item.setCurrentQuantity(new BigDecimal("20.000"));
        when(itemRepo.findById(1L)).thenReturn(Optional.of(item));

        StockOutRequest req = new StockOutRequest(
                new BigDecimal("5.000"),
                "ADJUSTMENT",
                "Cân chỉnh do nhập nhầm số liệu hôm qua"
        );

        // WHEN: Thực hiện giảm kho 5.000 kg
        InventoryItemView result = inventoryService.stockOut(1L, req, sampleManager);

        // THEN: Tồn mới phải giảm xuống đúng 20.000 - 5.000 = 15.000 kg
        assertEquals(new BigDecimal("15.000"), result.currentQuantity());
        assertEquals(new BigDecimal("15.000"), item.getCurrentQuantity());

        // Xác minh có lưu 1 giao dịch loại ADJUSTMENT
        verify(txRepo, times(1)).save(argThat(tx ->
                tx.getInventoryItem().equals(item) &&
                tx.getCreatedBy().equals(sampleManager) &&
                StockTransaction.ADJUSTMENT.equals(tx.getTransactionType()) &&
                new BigDecimal("5.000").equals(tx.getQuantity()) &&
                "Cân chỉnh do nhập nhầm số liệu".equals(tx.getReason()) &&
                "Cân chỉnh do nhập nhầm số liệu hôm qua".equals(tx.getNote())
        ));
    }

    @Test
    @DisplayName("TC9: Bắt lỗi 400 BadRequest khi số lượng giảm vượt quá tồn hiện tại")
    void stockOut_ThrowsBadRequest_WhenQuantityExceedsCurrent() {
        // GIVEN: Nguyên liệu chỉ còn tồn 10.000 kg
        InventoryItem item = new InventoryItem();
        item.setCurrentQuantity(new BigDecimal("10.000"));
        when(itemRepo.findById(1L)).thenReturn(Optional.of(item));

        // Quản lý muốn giảm 15.000 kg (vượt quá 10.000 kg)
        StockOutRequest req = new StockOutRequest(
                new BigDecimal("15.000"),
                "WASTE",
                "Bị đổ vỡ hỏng"
        );

        // WHEN & THEN: Phải ném lỗi BadRequest
        com.example.project.exception.ApiException ex = assertThrows(
                com.example.project.exception.ApiException.class,
                () -> inventoryService.stockOut(1L, req, sampleManager)
        );

        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("không được vượt quá số lượng tồn hiện tại"));
        verify(txRepo, never()).save(any(StockTransaction.class));
    }

    @Test
    @DisplayName("TC11: Báo hao hụt / hư hỏng tại quầy (WASTE - UC-B06) thành công")
    void waste_success() {
        InventoryItem item = new InventoryItem();
        item.setItemName("Coffee beans");
        item.setCurrentQuantity(new BigDecimal("10.000"));
        when(itemRepo.findById(1L)).thenReturn(Optional.of(item));

        WasteReportRequest req = new WasteReportRequest(new BigDecimal("0.500"), "Bị rơi đổ");
        InventoryItemView view = inventoryService.waste(1L, req, sampleManager);
        assertNotNull(view);

        assertEquals(new BigDecimal("9.500"), item.getCurrentQuantity());
        verify(txRepo, times(1)).save(argThat(tx ->
                StockTransaction.WASTE.equals(tx.getTransactionType()) &&
                new BigDecimal("0.500").equals(tx.getQuantity()) &&
                tx.getNote().contains("Bị rơi đổ")
        ));
    }

    @Test
    @DisplayName("TC11B: Báo sự cố hao hụt lỗi chủ quan kèm quy trách nhiệm nhân viên và % bồi thường")
    void waste_subjectiveWithAccountability_success() {
        InventoryItem item = new InventoryItem();
        item.setItemName("Fresh milk");
        item.setCurrentQuantity(new BigDecimal("8.000"));
        item.setUnitCost(35000L);
        when(itemRepo.findById(2L)).thenReturn(Optional.of(item));

        User staff = new User();
        org.springframework.test.util.ReflectionTestUtils.setField(staff, "id", 4L);
        staff.setFullName("Trần Văn Barista");
        when(userRepo.findById(4L)).thenReturn(Optional.of(staff));

        WasteReportRequest req = new WasteReportRequest(
                new BigDecimal("2.000"),
                "Làm rơi vỡ bình sữa khi đánh bọt",
                "SUBJECTIVE",
                4L,
                50,
                "https://example.com/evidence.jpg"
        );

        InventoryItemView view = inventoryService.waste(2L, req, sampleManager);
        assertNotNull(view);
        assertEquals(new BigDecimal("6.000"), item.getCurrentQuantity()); // 8 - 2 = 6

        verify(txRepo, times(1)).save(argThat(tx ->
                StockTransaction.WASTE.equals(tx.getTransactionType()) &&
                new BigDecimal("2.000").equals(tx.getQuantity()) &&
                tx.getNote().contains("[BIÊN BẢN SỰ CỐ - LỖI CHỦ QUAN]") &&
                tx.getNote().contains("Trần Văn Barista") &&
                tx.getNote().contains("Phạt: 50%")
        ));
    }

    @Test
    @DisplayName("TC12: Tự động trừ nguyên liệu khi Barista nhận đơn theo công thức thành công")
    void deductForOrder_success() {
        InventoryItem coffee = new InventoryItem();
        org.springframework.test.util.ReflectionTestUtils.setField(coffee, "id", 1L);
        coffee.setItemName("Coffee beans");
        coffee.setUnit("kg");
        coffee.setCurrentQuantity(new BigDecimal("5.000"));

        InventoryItem milk = new InventoryItem();
        org.springframework.test.util.ReflectionTestUtils.setField(milk, "id", 2L);
        milk.setItemName("Fresh milk");
        milk.setUnit("litre");
        milk.setCurrentQuantity(new BigDecimal("10.000"));

        when(itemRepo.findAllByStatusOrderByItemNameAsc(InventoryItem.ACTIVE))
                .thenReturn(List.of(coffee, milk));

        MenuItem americano = new MenuItem();
        americano.setName("Americano");
        americano.setRecipeIngredients("0.020 kg Coffee beans");

        OrderItem orderItem = new OrderItem();
        orderItem.setMenuItem(americano);
        orderItem.setQuantity(2);
        orderItem.setItemStatus(OrderItem.PENDING);

        Order order = new Order();
        order.setOrderNumber("ORD-001");
        order.addItem(orderItem);

        inventoryService.deductForOrder(order, sampleManager);

        // 2 ly * 0.020 = 0.040 kg -> 5.000 - 0.040 = 4.960 kg
        assertEquals(new BigDecimal("4.960"), coffee.getCurrentQuantity());
        verify(itemRepo, times(1)).save(coffee);
        verify(txRepo, times(1)).save(argThat(tx ->
                StockTransaction.STOCK_OUT.equals(tx.getTransactionType()) &&
                new BigDecimal("0.040").equals(tx.getQuantity())
        ));
    }

    @Test
    @DisplayName("TC13: Tự động trừ nguyên liệu ném lỗi BadRequest khi không đủ tồn kho")
    void deductForOrder_insufficientStock_throwsBadRequest() {
        InventoryItem coffee = new InventoryItem();
        org.springframework.test.util.ReflectionTestUtils.setField(coffee, "id", 1L);
        coffee.setItemName("Coffee beans");
        coffee.setUnit("kg");
        coffee.setCurrentQuantity(new BigDecimal("0.010")); // Chỉ còn 0.01 kg

        when(itemRepo.findAllByStatusOrderByItemNameAsc(InventoryItem.ACTIVE))
                .thenReturn(List.of(coffee));

        MenuItem americano = new MenuItem();
        americano.setName("Americano");
        americano.setRecipeIngredients("0.020 kg Coffee beans"); // Cần 0.02 kg

        OrderItem orderItem = new OrderItem();
        orderItem.setMenuItem(americano);
        orderItem.setQuantity(1);
        orderItem.setItemStatus(OrderItem.PENDING);

        Order order = new Order();
        order.setOrderNumber("ORD-002");
        order.addItem(orderItem);

        com.example.project.exception.ApiException ex = assertThrows(
                com.example.project.exception.ApiException.class,
                () -> inventoryService.deductForOrder(order, sampleManager)
        );

        assertTrue(ex.getMessage().contains("Không đủ nguyên liệu"));
        verify(txRepo, never()).save(any(StockTransaction.class));
    }
}
