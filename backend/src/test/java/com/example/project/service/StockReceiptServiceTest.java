package com.example.project.service;

import com.example.project.dto.inventory.BatchShortageItemRequest;
import com.example.project.dto.inventory.BatchShortageReportRequest;
import com.example.project.dto.inventory.ShortageReportRequest;
import com.example.project.dto.inventory.StockReceiptItemRequest;
import com.example.project.dto.inventory.StockReceiptRequest;
import com.example.project.dto.inventory.StockReceiptView;
import com.example.project.entity.InventoryItem;
import com.example.project.entity.StockReceipt;
import com.example.project.entity.StockReceiptItem;
import com.example.project.entity.StockTransaction;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.InventoryItemRepository;
import com.example.project.repository.StockReceiptRepository;
import com.example.project.repository.StockTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockReceiptServiceTest {

    @Mock
    private StockReceiptRepository receiptRepo;

    @Mock
    private InventoryItemRepository itemRepo;

    @Mock
    private StockTransactionRepository txRepo;

    @InjectMocks
    private StockReceiptService stockReceiptService;

    private User sampleUser;
    private InventoryItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        org.springframework.test.util.ReflectionTestUtils.setField(sampleUser, "id", 2L);
        sampleUser.setFullName("Nguyễn Quản Lý");

        sampleItem = new InventoryItem();
        org.springframework.test.util.ReflectionTestUtils.setField(sampleItem, "id", 1L);
        sampleItem.setItemName("Coffee beans");
        sampleItem.setUnit("kg");
        sampleItem.setCurrentQuantity(new BigDecimal("10.000"));
        sampleItem.setUnitCost(200000L);
        sampleItem.setStatus(InventoryItem.ACTIVE);
    }

    @Test
    @DisplayName("Tạo phiếu nhập nháp (DRAFT) thành công với tổng tiền chính xác")
    void createDraft_success() {
        when(itemRepo.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(receiptRepo.existsByReceiptCode(any())).thenReturn(false);

        StockReceiptItemRequest itemReq = new StockReceiptItemRequest(1L, new BigDecimal("5.000"), 200000L);
        StockReceiptRequest req = new StockReceiptRequest("Công ty Cà phê Việt", LocalDate.now(), "Nhập định kỳ", List.of(itemReq));

        StockReceiptView view = stockReceiptService.createDraft(req, sampleUser);

        assertNotNull(view);
        assertEquals(StockReceipt.DRAFT, view.status());
        assertEquals("Công ty Cà phê Việt", view.supplierName());
        assertEquals(1000000L, view.totalAmount()); // 5 * 200,000 = 1,000,000
        verify(receiptRepo, times(1)).save(any(StockReceipt.class));
    }

    @Test
    @DisplayName("Barista báo thiếu nguyên liệu -> tạo phiếu yêu cầu dạng DRAFT")
    void createShortageReport_success() {
        when(itemRepo.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(receiptRepo.existsByReceiptCode(any())).thenReturn(false);

        ShortageReportRequest req = new ShortageReportRequest(1L, new BigDecimal("8.000"), "Quầy sắp cạn hạt espresso");
        StockReceiptView view = stockReceiptService.createShortageReport(req, sampleUser);

        assertNotNull(view);
        assertEquals(StockReceipt.DRAFT, view.status());
        assertTrue(view.receiptCode().startsWith("YC-"));
        assertTrue(view.note().contains("Quầy sắp cạn hạt espresso"));
        assertEquals(1600000L, view.totalAmount()); // 8 * 200,000
        verify(receiptRepo, times(1)).save(any(StockReceipt.class));
    }

    @Test
    @DisplayName("Xác nhận nhập kho -> trạng thái RECEIVED, tăng tồn kho và ghi lịch sử STOCK_IN")
    void confirmReceipt_success() {
        StockReceipt receipt = new StockReceipt();
        receipt.setId(10L);
        receipt.setReceiptCode("PN-20261017-001");
        receipt.setSupplierName("Nhà cung cấp ABC");
        receipt.setStatus(StockReceipt.DRAFT);
        receipt.setCreatedBy(sampleUser);

        StockReceiptItem item = new StockReceiptItem();
        item.setInventoryItem(sampleItem);
        item.setQuantity(new BigDecimal("5.000"));
        item.setUnitCost(220000L);
        item.calcSubtotal();
        receipt.addItem(item);

        when(receiptRepo.findWithDetailsById(10L)).thenReturn(Optional.of(receipt));

        StockReceiptView view = stockReceiptService.confirmReceipt(10L, sampleUser);

        assertEquals(StockReceipt.RECEIVED, view.status());
        assertNotNull(receipt.getConfirmedAt());
        assertEquals(new BigDecimal("15.000"), sampleItem.getCurrentQuantity()); // 10 + 5
        // Bình quân gia quyền: (10 * 200.000 + 5 * 220.000) / 15 = 3.100.000 / 15 = 206.667 đ
        assertEquals(206667L, sampleItem.getUnitCost());

        verify(itemRepo, times(1)).save(sampleItem);
        verify(txRepo, times(1)).save(any(StockTransaction.class));
        verify(receiptRepo, times(1)).save(receipt);
    }

    @Test
    @DisplayName("Hàm calculateWeightedAverageCost tính chính xác theo công thức bình quân gia quyền")
    void calculateWeightedAverageCost_variousCases() {
        // Trường hợp 1: Tồn cũ 10kg giá 200k, nhập 5kg giá 212k -> BQ = 204.000 đ
        long cost1 = StockReceiptService.calculateWeightedAverageCost(
                new BigDecimal("10.000"), 200000L, new BigDecimal("5.000"), 212000L);
        assertEquals(204000L, cost1);

        // Trường hợp 2: Kho đang hết hàng (tồn 0kg) -> Lấy luôn giá nhập mới
        long cost2 = StockReceiptService.calculateWeightedAverageCost(
                BigDecimal.ZERO, 200000L, new BigDecimal("5.000"), 215000L);
        assertEquals(215000L, cost2);

        // Trường hợp 3: Đơn giá nhập không hợp lệ hoặc = 0 -> Giữ nguyên giá cũ
        long cost3 = StockReceiptService.calculateWeightedAverageCost(
                new BigDecimal("10.000"), 200000L, new BigDecimal("5.000"), 0L);
        assertEquals(200000L, cost3);
    }

    @Test
    @DisplayName("Xác nhận phiếu không ở trạng thái DRAFT sẽ báo lỗi")
    void confirmReceipt_notDraft_throwsException() {
        StockReceipt receipt = new StockReceipt();
        receipt.setId(10L);
        receipt.setStatus(StockReceipt.RECEIVED);

        when(receiptRepo.findWithDetailsById(10L)).thenReturn(Optional.of(receipt));

        assertThrows(ApiException.class, () -> stockReceiptService.confirmReceipt(10L, sampleUser));
        verify(itemRepo, never()).save(any());
        verify(txRepo, never()).save(any());
    }

    @Test
    @DisplayName("Hủy phiếu nhập kho DRAFT thành công")
    void cancelReceipt_success() {
        StockReceipt receipt = new StockReceipt();
        receipt.setId(10L);
        receipt.setStatus(StockReceipt.DRAFT);

        when(receiptRepo.findWithDetailsById(10L)).thenReturn(Optional.of(receipt));

        StockReceiptView view = stockReceiptService.cancelReceipt(10L, "Không còn nhu cầu");

        assertEquals(StockReceipt.CANCELLED, view.status());
        assertTrue(view.note().contains("Không còn nhu cầu"));
        verify(receiptRepo, times(1)).save(receipt);
    }

    @Test
    @DisplayName("Tạo đề xuất bổ sung hàng loạt từ Barista thành công")
    void createBatchShortageReport_success() {
        InventoryItem item1 = new InventoryItem();
        org.springframework.test.util.ReflectionTestUtils.setField(item1, "id", 1L);
        item1.setItemName("Cà phê Robusta");
        item1.setUnit("kg");
        item1.setCurrentQuantity(new BigDecimal("2.000"));
        item1.setUnitCost(200000L);

        InventoryItem item2 = new InventoryItem();
        org.springframework.test.util.ReflectionTestUtils.setField(item2, "id", 2L);
        item2.setItemName("Sữa đặc Ngôi Sao");
        item2.setUnit("hộp");
        item2.setCurrentQuantity(new BigDecimal("1.000"));
        item2.setUnitCost(25000L);

        when(itemRepo.findById(1L)).thenReturn(Optional.of(item1));
        when(itemRepo.findById(2L)).thenReturn(Optional.of(item2));
        when(receiptRepo.existsByReceiptCode(any())).thenReturn(false);
        when(receiptRepo.save(any(StockReceipt.class))).thenAnswer(inv -> {
            StockReceipt r = inv.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(r, "id", 99L);
            return r;
        });

        BatchShortageReportRequest req = new BatchShortageReportRequest(
                "URGENT",
                "Quầy bar sắp hết nguyên liệu pha chế ca tối",
                List.of(
                        new BatchShortageItemRequest(1L, new BigDecimal("10.000"), "URGENT"),
                        new BatchShortageItemRequest(2L, new BigDecimal("24.000"), "NORMAL")
                )
        );

        StockReceiptView view = stockReceiptService.createBatchShortageReport(req, sampleUser);

        assertNotNull(view);
        assertEquals(StockReceipt.DRAFT, view.status());
        assertTrue(view.receiptCode().startsWith("YC-"));
        assertTrue(view.note().contains("[KHẨN CẤP]"));
        assertEquals(2, view.items().size());
        verify(receiptRepo, times(1)).save(any(StockReceipt.class));
    }
}
