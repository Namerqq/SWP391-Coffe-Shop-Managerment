package com.example.project.service;

import com.example.project.dto.waiter.IncidentItemRequest;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.*;

/**
 * Phục vụ báo sự cố đổ / vỡ món (ServingService.reportIncident) - các lỗi sửa ngày 13/11/2026:
 *  - Lỗi 1: REMAKE món của đơn ngày trước làm món kẹt mãi ở Chờ pha (pha chế không còn thấy đơn) -> chặn.
 *  - Lỗi 6: đơn đã thanh toán không hủy món ở đây (backend vẫn chặn, giao diện tắt lựa chọn).
 * Chạy riêng: mvn test -Dtest=ServingIncidentTest
 */
class ServingIncidentTest {

    private OrderLockRepository lockRepository;
    private OrderRepository orderRepository;
    private OrderSupportService support;
    private IncidentReportService incidentService;
    private ServingService service;
    private final User waiter = new User();

    @BeforeEach
    void setUp() {
        lockRepository = mock(OrderLockRepository.class);
        orderRepository = mock(OrderRepository.class);
        support = mock(OrderSupportService.class); // toView trả null: kiểm tra trên entity
        incidentService = mock(IncidentReportService.class);
        service = new ServingService(orderRepository, lockRepository, support, incidentService);
    }

    private static OrderItem item(long id, String name, String status, int qty, long unitPrice) {
        MenuItem m = new MenuItem();
        m.setName(name);
        OrderItem i = new OrderItem();
        ReflectionTestUtils.setField(i, "id", id);
        i.setMenuItem(m);
        i.setQuantity(qty);
        i.setUnitPrice(unitPrice);
        i.setSizePrice(0L);
        i.setToppingPrice(0L);
        i.setItemStatus(status);
        i.recalcSubtotal();
        return i;
    }

    /** Đơn tại bàn tạo lúc createdAt, paid = đã thanh toán chưa. */
    private Order order(LocalDateTime createdAt, boolean paid, OrderItem... items) {
        Order o = new Order();
        ReflectionTestUtils.setField(o, "id", 10L);
        ReflectionTestUtils.setField(o, "createdAt", createdAt);
        o.setOrderNumber("OD261112-0007");
        o.setFulfillmentType(Order.DINE_IN);
        o.setStatus(Order.READY);
        o.setPaymentStatus(paid ? Order.PAID : Order.UNPAID);
        for (OrderItem i : items) {
            i.setOrder(o);
            o.getItems().add(i);
        }
        o.recalcTotal();
        when(lockRepository.findWithLockById(10L)).thenReturn(Optional.of(o));
        return o;
    }

    private static LocalDateTime yesterday() { return LocalDateTime.now().minusDays(1); }
    private static LocalDateTime today() { return LocalDateTime.now(); }

    @Test
    @DisplayName("Lỗi 1: REMAKE món của đơn hôm trước (chưa thanh toán) bị chặn, gợi ý hủy món")
    void remakeOnPreviousDayUnpaidOrderIsRejected() {
        OrderItem latte = item(1, "Latte", OrderItem.READY, 1, 45000);
        Order o = order(yesterday(), false, latte);

        ApiException ex = assertThrows(ApiException.class, () -> service.reportIncident(10L, 1L,
                new IncidentItemRequest("REMAKE", "Vỡ ly", null), waiter));

        assertTrue(ex.getMessage().contains("ngày trước"), ex.getMessage());
        assertTrue(ex.getMessage().contains("Khách không muốn làm lại"), ex.getMessage());
        assertEquals(OrderItem.READY, latte.getItemStatus(), "món giữ nguyên Chờ mang ra");
        assertEquals(1, o.getItems().size(), "không tách dòng");
        verify(incidentService, never()).create(any(), any(), anyString(), anyString());
        verify(orderRepository, never()).flush();
    }

    @Test
    @DisplayName("Lỗi 1: REMAKE món của đơn hôm trước đã thanh toán bị chặn, gợi ý thu ngân hoàn tiền")
    void remakeOnPreviousDayPaidOrderIsRejectedWithRefundHint() {
        OrderItem latte = item(1, "Latte", OrderItem.READY, 1, 45000);
        order(yesterday(), true, latte);

        ApiException ex = assertThrows(ApiException.class, () -> service.reportIncident(10L, 1L,
                new IncidentItemRequest("REMAKE", "Vỡ ly", null), waiter));

        assertTrue(ex.getMessage().contains("hoàn tiền"), ex.getMessage());
        assertEquals(OrderItem.READY, latte.getItemStatus());
        verify(incidentService, never()).create(any(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Lỗi 1: REMAKE một phần dòng của đơn hôm trước cũng bị chặn, dòng không bị tách")
    void partialRemakeOnPreviousDayOrderDoesNotSplitLine() {
        OrderItem latte = item(1, "Latte", OrderItem.READY, 2, 45000);
        Order o = order(yesterday(), false, latte);

        assertThrows(ApiException.class, () -> service.reportIncident(10L, 1L,
                new IncidentItemRequest("REMAKE", "Vỡ ly", 1), waiter));

        assertEquals(1, o.getItems().size());
        assertEquals(2, latte.getQuantity());
        assertEquals(90000L, o.activeTotal());
    }

    @Test
    @DisplayName("Lỗi 1: đơn hôm trước chưa thanh toán vẫn hủy món (CANCEL) được và có biên bản")
    void cancelOnPreviousDayUnpaidOrderStillWorks() {
        OrderItem latte = item(1, "Latte", OrderItem.READY, 1, 45000);
        OrderItem tea = item(2, "Trà đào", OrderItem.SERVED, 1, 35000);
        Order o = order(yesterday(), false, latte, tea);

        service.reportIncident(10L, 1L, new IncidentItemRequest("CANCEL", "Vỡ ly", null), waiter);

        assertEquals(OrderItem.CANCELLED, latte.getItemStatus());
        assertEquals(35000L, o.activeTotal(), "trừ tiền Latte");
        assertEquals(Order.SERVED, o.getStatus(), "món còn lại đã mang ra -> đơn Đã phục vụ");
        verify(incidentService).create(same(latte), same(waiter), eq(IncidentReport.CANCEL), eq("Vỡ ly"));
    }

    @Test
    @DisplayName("Hồi quy: REMAKE món của đơn hôm nay vẫn gửi lại pha chế, tổng tiền giữ nguyên")
    void remakeOnTodayOrderStillWorks() {
        OrderItem latte = item(1, "Latte", OrderItem.READY, 2, 45000);
        Order o = order(today(), true, latte);

        service.reportIncident(10L, 1L, new IncidentItemRequest("REMAKE", "Vỡ ly", 1), waiter);

        assertEquals(2, o.getItems().size(), "tách 1 ly làm lại thành dòng riêng");
        OrderItem remade = o.getItems().get(1);
        assertEquals(OrderItem.PENDING, remade.getItemStatus());
        assertEquals(OrderItem.READY, latte.getItemStatus());
        assertEquals(90000L, o.activeTotal(), "không tính thêm tiền ly làm lại");
        assertEquals(Order.PREPARING, o.getStatus());
        verify(orderRepository).flush();
        verify(incidentService).create(same(remade), same(waiter), eq(IncidentReport.REMAKE), eq("Vỡ ly"));
    }

    @Test
    @DisplayName("Lỗi 6: CANCEL món của đơn đã thanh toán bị backend chặn, món và tiền giữ nguyên")
    void cancelOnPaidOrderIsRejected() {
        OrderItem latte = item(1, "Latte", OrderItem.READY, 1, 45000);
        Order o = order(today(), true, latte);

        ApiException ex = assertThrows(ApiException.class, () -> service.reportIncident(10L, 1L,
                new IncidentItemRequest("CANCEL", "Vỡ ly", null), waiter));

        assertTrue(ex.getMessage().contains("đã thanh toán"), ex.getMessage());
        assertEquals(OrderItem.READY, latte.getItemStatus());
        assertEquals(45000L, o.activeTotal());
        verify(incidentService, never()).create(any(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Order.isFromPreviousDay: trước 0h hôm nay = ngày trước; null / hôm nay = không")
    void previousDayBoundary() {
        Order o = new Order();
        assertFalse(o.isFromPreviousDay(), "chưa có createdAt");
        ReflectionTestUtils.setField(o, "createdAt", java.time.LocalDate.now().atStartOfDay());
        assertFalse(o.isFromPreviousDay(), "đúng 0h hôm nay là hôm nay");
        ReflectionTestUtils.setField(o, "createdAt", java.time.LocalDate.now().atStartOfDay().minusSeconds(1));
        assertTrue(o.isFromPreviousDay(), "23:59:59 hôm qua");
    }
}
