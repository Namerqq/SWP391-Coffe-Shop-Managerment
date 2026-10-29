package com.example.project.service;

import com.example.project.dto.cashier.CancelItemRequest;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.*;

/**
 * Bỏ món chưa phục vụ khi thanh toán (ThangNN Iter3).
 * Chạy riêng: mvn test -Dtest=CashierItemServiceTest
 */
class CashierItemServiceTest {

    private OrderLockRepository lockRepository;
    private OrderRepository orderRepository;
    private OrderSupportService support;
    private IncidentReportService incidentService;
    private CashierItemService service;
    private final User cashier = new User();

    @BeforeEach
    void setUp() {
        lockRepository = mock(OrderLockRepository.class);
        orderRepository = mock(OrderRepository.class);
        support = mock(OrderSupportService.class); // toView trả null: kiểm tra trên entity
        incidentService = mock(IncidentReportService.class);
        service = new CashierItemService(lockRepository, orderRepository, support, incidentService);
    }

    private static OrderItem item(long id, String name, String status, long subtotal) {
        MenuItem m = new MenuItem();
        m.setName(name);
        OrderItem i = new OrderItem();
        ReflectionTestUtils.setField(i, "id", id);
        i.setMenuItem(m);
        i.setQuantity(1);
        i.setItemStatus(status);
        i.setSubtotal(subtotal);
        return i;
    }

    /** Đơn tại bàn chưa thanh toán gồm các món truyền vào. */
    private Order order(String status, OrderItem... items) {
        Order o = new Order();
        ReflectionTestUtils.setField(o, "id", 10L);
        o.setOrderNumber("OD261029-0007");
        o.setFulfillmentType(Order.DINE_IN);
        o.setStatus(status);
        for (OrderItem i : items) {
            i.setOrder(o);
            o.getItems().add(i);
        }
        o.recalcTotal();
        when(lockRepository.findWithLockById(10L)).thenReturn(Optional.of(o));
        return o;
    }

    @Test
    void cancelWaitingItemRecalculatesTotalWithoutIncident() {
        OrderItem tea = item(1, "Trà đào", OrderItem.PENDING, 35000);
        OrderItem coffee = item(2, "Cà phê sữa", OrderItem.SERVED, 29000);
        Order o = order(Order.PREPARING, tea, coffee);

        service.cancelUnservedItem(10L, 1L, new CancelItemRequest(null, "PENDING"), cashier);

        assertEquals(OrderItem.CANCELLED, tea.getItemStatus());
        assertEquals(29000L, o.getTotalAmount());
        assertEquals(Order.SERVED, o.getStatus()); // món còn lại đã mang ra -> đơn coi như đã phục vụ
        verify(orderRepository).saveAndFlush(o);
        verifyNoInteractions(incidentService);
        verify(support).closeSessionIfSettled(any());
    }

    @Test
    void cancelReadyItemCreatesIncidentForManager() {
        OrderItem tea = item(1, "Trà đào", OrderItem.READY, 35000);
        OrderItem cake = item(2, "Bánh flan", OrderItem.READY, 20000);
        Order o = order(Order.READY, tea, cake);

        service.cancelUnservedItem(10L, 1L, new CancelItemRequest("Chờ lâu quá", "READY"), cashier);

        assertEquals(OrderItem.CANCELLED, tea.getItemStatus());
        assertEquals(20000L, o.getTotalAmount());
        verify(incidentService).create(eq(tea), eq(cashier), eq(IncidentReport.CANCEL),
                startsWith(CashierItemService.INCIDENT_PREFIX));
        verify(incidentService).create(any(), any(), anyString(), eq(CashierItemService.INCIDENT_PREFIX + "Chờ lâu quá"));
    }

    @Test
    void cancellingLastItemCancelsOrderWithReason() {
        OrderItem tea = item(1, "Trà đào", OrderItem.PENDING, 35000);
        Order o = order(Order.PENDING, tea);

        service.cancelUnservedItem(10L, 1L, new CancelItemRequest("  ", null), cashier);

        assertTrue(o.isCancelled());
        assertEquals(CashierItemService.DEFAULT_REASON, o.getCancelReason());
        verify(support).closeSessionIfEmpty(any());
    }

    @Test
    void servedItemCannotBeCancelled() {
        OrderItem tea = item(1, "Trà đào", OrderItem.SERVED, 35000);
        OrderItem cake = item(2, "Bánh flan", OrderItem.PENDING, 20000);
        order(Order.PREPARING, tea, cake);

        assertThrows(ApiException.class, () -> service.cancelUnservedItem(10L, 1L, null, cashier));
        assertEquals(OrderItem.SERVED, tea.getItemStatus());
        verifyNoInteractions(orderRepository, incidentService);
    }

    @Test
    void paidOrderIsLeftToRefund() {
        OrderItem tea = item(1, "Trà đào", OrderItem.PENDING, 35000);
        OrderItem cake = item(2, "Bánh flan", OrderItem.PENDING, 20000);
        Order o = order(Order.PENDING, tea, cake);
        o.setPaymentStatus(Order.PAID);

        ApiException e = assertThrows(ApiException.class, () -> service.cancelUnservedItem(10L, 1L, null, cashier));
        assertEquals(400, e.getStatus().value());
        assertEquals(OrderItem.PENDING, tea.getItemStatus());
    }

    @Test
    void itemThatChangedStatusMeanwhileIsConflict() {
        // Thu ngân thấy "Chờ pha" nhưng pha chế vừa pha xong -> không tự ghi biên bản, bắt thu ngân xem lại.
        OrderItem tea = item(1, "Trà đào", OrderItem.READY, 35000);
        OrderItem cake = item(2, "Bánh flan", OrderItem.PENDING, 20000);
        order(Order.PREPARING, tea, cake);

        ApiException e = assertThrows(ApiException.class,
                () -> service.cancelUnservedItem(10L, 1L, new CancelItemRequest(null, "PENDING"), cashier));
        assertEquals(409, e.getStatus().value());
        assertEquals(OrderItem.READY, tea.getItemStatus());
        verifyNoInteractions(incidentService);
    }

    @Test
    void legacyPreparingCountsAsWaiting() {
        OrderItem tea = item(1, "Trà đào", OrderItem.PREPARING, 35000);
        OrderItem cake = item(2, "Bánh flan", OrderItem.PENDING, 20000);
        order(Order.PREPARING, tea, cake);

        service.cancelUnservedItem(10L, 1L, new CancelItemRequest(null, "PENDING"), cashier);

        assertEquals(OrderItem.CANCELLED, tea.getItemStatus());
        verifyNoInteractions(incidentService);
    }

    @Test
    void takeawayOrderIsRejected() {
        OrderItem tea = item(1, "Trà đào", OrderItem.PENDING, 35000);
        Order o = order(Order.PENDING, tea);
        o.setFulfillmentType(Order.PICKUP);

        assertThrows(ApiException.class, () -> service.cancelUnservedItem(10L, 1L, null, cashier));
    }

    @Test
    void orderInPendingQrIsRejected() {
        OrderItem tea = item(1, "Trà đào", OrderItem.PENDING, 35000);
        OrderItem cake = item(2, "Bánh flan", OrderItem.PENDING, 20000);
        Order o = order(Order.PENDING, tea, cake);
        doThrow(ApiException.badRequest("đang chờ QR")).when(support).ensureNotInPendingQr(o, "bỏ món");

        assertThrows(ApiException.class, () -> service.cancelUnservedItem(10L, 1L, null, cashier));
        assertEquals(OrderItem.PENDING, tea.getItemStatus());
    }

    @Test
    void incidentReasonIsCutTo300Chars() {
        assertEquals(300, CashierItemService.incidentReason("x".repeat(400)).length());
    }
}
