package com.example.project.service;

import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.OrderItemRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Unit Test cho BaristaService (JUnit 5 + Mockito), đủ phủ các nhánh rẽ. */
@ExtendWith(MockitoExtension.class)
class BaristaServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderLockRepository lockRepository;
    @Mock private OrderItemRepository itemRepository;
    @Mock private MenuItemRepository menuItemRepository;
    @Mock private OrderSupportService support;
    @Mock private InventoryService inventoryService;

    @InjectMocks
    private BaristaService baristaService;

    private final User barista = new User();

    /** Tạo đơn và cho lockRepository trả về đơn đó. */
    private Order order(Long id, String status, String source) {
        Order o = new Order();
        ReflectionTestUtils.setField(o, "id", id);
        o.setStatus(status);
        o.setSource(source);
        lenient().when(lockRepository.findWithLockById(id)).thenReturn(Optional.of(o));
        return o;
    }

    private static OrderItem item(Order o, Long id, String status, String note) {
        OrderItem i = new OrderItem();
        ReflectionTestUtils.setField(i, "id", id);
        i.setItemStatus(status);
        i.setNote(note);
        i.setSubtotal(30000L);
        o.addItem(i);
        return i;
    }

    // ===================== board / detail / recipe =====================

    @Test
    @DisplayName("board: ẩn đơn online còn chờ xác nhận")
    void board() {
        Order staff = order(1L, Order.PENDING, Order.SOURCE_STAFF);
        Order onlinePending = order(2L, Order.PENDING, Order.SOURCE_ONLINE);
        Order onlineConfirmed = order(3L, Order.CONFIRMED, Order.SOURCE_ONLINE);
        when(orderRepository.findByStatusInOrderByCreatedAtAsc(anyList()))
                .thenReturn(List.of(staff, onlinePending, onlineConfirmed));

        baristaService.board();

        verify(support).toView(staff);
        verify(support).toView(onlineConfirmed);
        verify(support, never()).toView(onlinePending);
    }

    @Test
    @DisplayName("detail: không tìm thấy đơn")
    void detail_notFound() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> baristaService.detail(99L));
    }

    @Test
    @DisplayName("recipe: trả về công thức món")
    void recipe_found() {
        MenuItem m = new MenuItem();
        m.setName("Matcha Latte");
        when(menuItemRepository.findById(5L)).thenReturn(Optional.of(m));

        assertEquals("Matcha Latte", baristaService.recipe(5L).name());
    }

    @Test
    @DisplayName("recipe: không tìm thấy món")
    void recipe_notFound() {
        when(menuItemRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> baristaService.recipe(99L));
    }

    // ===================== checkItem =====================

    @Test
    @DisplayName("checkItem: đơn không còn trên bảng / đơn online chưa xác nhận / món không thuộc đơn")
    void checkItem_invalidOrder() {
        order(1L, Order.SERVED, Order.SOURCE_STAFF);
        order(2L, Order.PENDING, Order.SOURCE_ONLINE);
        item(order(3L, Order.PENDING, Order.SOURCE_STAFF), 30L, OrderItem.PENDING, null);

        assertThrows(ApiException.class, () -> baristaService.checkItem(1L, 10L, true, barista));
        assertThrows(ApiException.class, () -> baristaService.checkItem(2L, 20L, true, barista));
        assertThrows(ResourceNotFoundException.class, () -> baristaService.checkItem(3L, 99L, true, barista));
    }

    @Test
    @DisplayName("checkItem tích: chỉ trừ kho ở món đầu tiên, tích hết thì đơn Chờ mang ra")
    void checkItem_done() {
        Order o = order(1L, Order.PENDING, Order.SOURCE_STAFF);
        item(o, 10L, OrderItem.PENDING, null);
        item(o, 11L, OrderItem.PENDING, null);

        baristaService.checkItem(1L, 10L, true, barista);
        assertEquals(Order.PREPARING, o.getStatus());

        baristaService.checkItem(1L, 11L, true, barista);
        assertEquals(Order.READY, o.getStatus());

        verify(inventoryService, times(1)).deductForOrder(o, barista);
    }

    @Test
    @DisplayName("checkItem tích: món đã pha xong thì báo lỗi")
    void checkItem_done_notWaiting() {
        item(order(1L, Order.READY, Order.SOURCE_STAFF), 10L, OrderItem.READY, null);
        assertThrows(ApiException.class, () -> baristaService.checkItem(1L, 10L, true, barista));
    }

    @Test
    @DisplayName("checkItem bỏ tích: món Chờ mang ra quay về Chờ pha")
    void checkItem_undo() {
        OrderItem line = item(order(1L, Order.READY, Order.SOURCE_STAFF), 10L, OrderItem.READY, null);

        baristaService.checkItem(1L, 10L, false, barista);

        assertEquals(OrderItem.PENDING, line.getItemStatus());
    }

    @Test
    @DisplayName("checkItem bỏ tích: món chưa pha xong thì báo lỗi")
    void checkItem_undo_notReady() {
        item(order(1L, Order.PENDING, Order.SOURCE_STAFF), 10L, OrderItem.PENDING, null);
        assertThrows(ApiException.class, () -> baristaService.checkItem(1L, 10L, false, barista));
    }

    // ===================== checkItems =====================

    @Test
    @DisplayName("checkItems: không tìm thấy món nào")
    void checkItems_empty() {
        when(itemRepository.findAllById(anyIterable())).thenReturn(List.of());
        assertThrows(ResourceNotFoundException.class, () -> baristaService.checkItems(List.of(1L), barista));
    }

    @Test
    @DisplayName("checkItems: tích nhiều món ở 2 đơn, bỏ qua món không chọn, chỉ trừ kho đơn chưa nhận")
    void checkItems() {
        Order o1 = order(1L, Order.PENDING, Order.SOURCE_STAFF);
        OrderItem a = item(o1, 10L, OrderItem.PENDING, null);
        OrderItem b = item(o1, 11L, OrderItem.PENDING, null);   // không chọn
        Order o2 = order(2L, Order.PREPARING, Order.SOURCE_STAFF);
        o2.setAcceptedAt(LocalDateTime.now());                   // đã nhận đơn
        OrderItem c = item(o2, 20L, OrderItem.READY, null);      // đã tích rồi
        OrderItem d = item(o2, 21L, OrderItem.PENDING, null);
        when(itemRepository.findAllById(anyIterable())).thenReturn(List.of(a, c, d));

        baristaService.checkItems(List.of(10L, 20L, 21L), barista);

        assertEquals(OrderItem.READY, a.getItemStatus());
        assertEquals(OrderItem.PENDING, b.getItemStatus());
        assertEquals(OrderItem.READY, d.getItemStatus());
        verify(inventoryService).deductForOrder(o1, barista);
        verify(inventoryService, never()).deductForOrder(o2, barista);
    }

    // ===================== cancelItem =====================

    @Test
    @DisplayName("cancelItem: món đã pha xong thì không hủy được")
    void cancelItem_notWaiting() {
        item(order(1L, Order.READY, Order.SOURCE_STAFF), 10L, OrderItem.READY, null);
        assertThrows(ApiException.class, () -> baristaService.cancelItem(1L, 10L));
    }

    @Test
    @DisplayName("cancelItem: đơn đã thanh toán thì không hủy được")
    void cancelItem_paid() {
        Order o = order(1L, Order.PENDING, Order.SOURCE_STAFF);
        o.setPaymentStatus(Order.PAID);
        item(o, 10L, OrderItem.PENDING, null);
        assertThrows(ApiException.class, () -> baristaService.cancelItem(1L, 10L));
    }

    @Test
    @DisplayName("cancelItem: hủy 1 phần thì đơn chưa hủy, ghi chú null/rỗng chỉ gắn tag")
    void cancelItem_partial() {
        Order o = order(1L, Order.PENDING, Order.SOURCE_STAFF);
        OrderItem a = item(o, 10L, OrderItem.PENDING, null);
        OrderItem b = item(o, 11L, OrderItem.PENDING, "   ");
        item(o, 12L, OrderItem.PENDING, null);

        baristaService.cancelItem(1L, 10L);
        baristaService.cancelItem(1L, 11L);

        assertEquals(BaristaService.OUT_OF_STOCK_TAG, a.getNote());
        assertEquals(BaristaService.OUT_OF_STOCK_TAG, b.getNote());
        assertEquals(30000L, o.getTotalAmount());
        assertFalse(o.isCancelled());
    }

    @Test
    @DisplayName("cancelItem: hủy món cuối thì đơn tự hủy, ghi chú dài bị cắt còn 300 ký tự")
    void cancelItem_last() {
        Order o = order(1L, Order.PENDING, Order.SOURCE_STAFF);
        OrderItem line = item(o, 10L, OrderItem.PENDING, "x".repeat(300));

        baristaService.cancelItem(1L, 10L);

        assertEquals(300, line.getNote().length());
        assertTrue(line.getNote().startsWith(BaristaService.OUT_OF_STOCK_TAG + " - x"));
        assertTrue(o.isCancelled());
        assertEquals("Hết nguyên liệu", o.getCancelReason());
    }
}
