package com.example.project.service;

import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import com.example.project.entity.Role;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Iter 3: các bước phục vụ bấm khi đi giao (lấy hàng, thu tiền COD, giao xong, giao lỗi).
 * Chạy riêng: mvn test -Dtest=DeliveryStepsTest
 */
class DeliveryStepsTest {

    private DeliveryRepository deliveryRepository;
    private OrderRepository orderRepository;
    private DeliveryService service;
    private CashierService cashier;
    private User waiter;
    private Order order;
    private Delivery delivery;

    @BeforeEach
    void setUp() {
        OrderLockRepository lockRepository = mock(OrderLockRepository.class);
        deliveryRepository = mock(DeliveryRepository.class);
        OnlineOrderService online = new OnlineOrderService(mock(OrderRepository.class), deliveryRepository,
                mock(OrderSupportService.class), lockRepository);
        orderRepository = mock(OrderRepository.class);
        service = new DeliveryService(orderRepository, lockRepository, deliveryRepository,
                mock(UserRepository.class), online);
        cashier = mock(CashierService.class);
        service.setCashierService(cashier);

        order = new Order();
        ReflectionTestUtils.setField(order, "id", 8L);
        order.setOrderNumber("261030-0008");
        order.setSource(Order.SOURCE_ONLINE);
        order.setFulfillmentType(Order.DELIVERY);
        order.setStatus(Order.READY);

        Role role = new Role();
        role.setName("WAITER");
        waiter = new User();
        ReflectionTestUtils.setField(waiter, "id", 5L);
        waiter.setFullName("Trần Bình");
        waiter.setRole(role);

        delivery = new Delivery();
        delivery.setDeliveryAddress("12 Nguyễn Trãi, Hà Nội");
        delivery.setAssignedWaiter(waiter);
        delivery.setDeliveryStatus(Delivery.STATUS_ASSIGNED);

        when(lockRepository.findWithLockById(8L)).thenReturn(Optional.of(order));
        when(deliveryRepository.findByOrder_Id(8L)).thenReturn(Optional.of(delivery));
    }

    @Test
    void pickUp_readyOrder_startsDelivering() {
        service.pickUp(8L, 5L);
        assertEquals(Delivery.STATUS_OUT_FOR_DELIVERY, delivery.getDeliveryStatus());
        assertNotNull(delivery.getPickedUpAt());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void pickUp_byAnotherWaiter_isForbidden() {
        ApiException ex = assertThrows(ApiException.class, () -> service.pickUp(8L, 6L));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals(Delivery.STATUS_ASSIGNED, delivery.getDeliveryStatus());
    }

    @Test
    void pickUp_beforeDrinksAreReady_isRejected() {
        order.setStatus(Order.PREPARING);
        ApiException ex = assertThrows(ApiException.class, () -> service.pickUp(8L, 5L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("chưa pha xong"));
        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void pickUp_twice_isRejected() {
        service.pickUp(8L, 5L);
        ApiException ex = assertThrows(ApiException.class, () -> service.pickUp(8L, 5L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    /** Đơn đã lấy hàng, đang giao, tổng tiền món 60.000đ (2 ly x 30.000đ). */
    private void outForDelivery() {
        OrderItem item = new OrderItem();
        item.setQuantity(2);
        item.setUnitPrice(30_000L);
        item.setSubtotal(60_000L);
        item.setItemStatus(OrderItem.READY);
        order.addItem(item);
        delivery.setDeliveryStatus(Delivery.STATUS_OUT_FOR_DELIVERY);
    }

    @Test
    void deliver_paidOrder_marksDeliveredAndCompletes() {
        outForDelivery();
        order.setPaymentStatus(Order.PAID); // đơn QR đã trả trước
        service.deliver(8L, 5L);

        assertEquals(Delivery.STATUS_DELIVERED, delivery.getDeliveryStatus());
        assertNotNull(delivery.getDeliveredAt());
        assertEquals(Order.SERVED, order.getStatus());
        assertEquals(OrderItem.SERVED, order.getItems().get(0).getItemStatus());
        assertNotNull(order.getCompletedAt());
        verifyNoInteractions(cashier); // giao xong không tự ghi thanh toán
    }

    @Test
    void deliver_codNotCollectedYet_isRejected() {
        outForDelivery();
        ApiException ex = assertThrows(ApiException.class, () -> service.deliver(8L, 5L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("chưa xác nhận thu tiền COD"));
        assertEquals(Delivery.STATUS_OUT_FOR_DELIVERY, delivery.getDeliveryStatus());
    }

    // ===== UC-W10 Xác nhận thu tiền COD =====

    @Test
    void confirmCod_recordsCashPaymentByWaiter() {
        outForDelivery();
        doAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setPaymentMethod(Payment.CASH);
            p.setPaymentStatus(Payment.PAID);
            p.setPaidAt(LocalDateTime.now());
            return null;
        }).when(cashier).record(any(), anyLong(), anyLong(), anyInt(), any(), any(), any(), any());

        var view = service.confirmCod(8L, waiter);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(cashier).record(captor.capture(), eq(60_000L), eq(0L), eq(0), eq(Payment.CASH),
                isNull(), eq(waiter), isNull());
        assertSame(order, captor.getValue().getOrder());
        assertTrue(order.isPaid());
        assertSame(captor.getValue(), order.getPayment());
        assertNotNull(order.getPaidAt());
        assertEquals(Delivery.STATUS_OUT_FOR_DELIVERY, delivery.getDeliveryStatus()); // còn phải bấm Đã giao
        assertEquals(Payment.CASH, view.paymentMethod());
        verify(orderRepository).save(order);
    }

    @Test
    void confirmCod_thenDeliver_completesOrder() {
        outForDelivery();
        service.confirmCod(8L, waiter);
        service.deliver(8L, 5L);
        assertEquals(Order.SERVED, order.getStatus());
        assertTrue(order.isPaid());
    }

    @Test
    void confirmCod_alreadyPaid_isRejected() {
        outForDelivery();
        order.setPaymentStatus(Order.PAID);
        ApiException ex = assertThrows(ApiException.class, () -> service.confirmCod(8L, waiter));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã thanh toán"));
        verifyNoInteractions(cashier);
    }

    @Test
    void confirmCod_twice_isRejected() {
        outForDelivery();
        service.confirmCod(8L, waiter);
        ApiException ex = assertThrows(ApiException.class, () -> service.confirmCod(8L, waiter));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(cashier, times(1)).record(any(), anyLong(), anyLong(), anyInt(), any(), any(), any(), any());
    }

    @Test
    void confirmCod_beforePickup_isRejected() {
        ApiException ex = assertThrows(ApiException.class, () -> service.confirmCod(8L, waiter));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertFalse(order.isPaid());
        verifyNoInteractions(cashier);
    }

    @Test
    void confirmCod_byAnotherWaiter_isForbidden() {
        outForDelivery();
        User other = new User();
        ReflectionTestUtils.setField(other, "id", 6L);
        ApiException ex = assertThrows(ApiException.class, () -> service.confirmCod(8L, other));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertFalse(order.isPaid());
        verifyNoInteractions(cashier);
    }

    @Test
    void deliver_beforePickup_isRejected() {
        ApiException ex = assertThrows(ApiException.class, () -> service.deliver(8L, 5L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("chưa lấy hàng"));
    }

    @Test
    void deliver_byAnotherWaiter_isForbidden() {
        outForDelivery();
        ApiException ex = assertThrows(ApiException.class, () -> service.deliver(8L, 6L));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void deliver_twice_isRejected() {
        outForDelivery();
        order.setPaymentStatus(Order.PAID);
        service.deliver(8L, 5L);
        ApiException ex = assertThrows(ApiException.class, () -> service.deliver(8L, 5L));
        assertTrue(ex.getMessage().contains("đã giao xong"));
    }

    @Test
    void fail_cancelsOrderWithReason() {
        outForDelivery();
        service.fail(8L, 5L, "  Khách không nghe máy ");

        assertEquals(Delivery.STATUS_FAILED, delivery.getDeliveryStatus());
        assertNotNull(delivery.getFailedAt());
        assertEquals("Khách không nghe máy", delivery.getFailureReason());
        assertEquals(Order.CANCELLED, order.getStatus());
        assertEquals("Giao không thành công: Khách không nghe máy", order.getCancelReason());
        assertNotNull(order.getCancelledAt());
        assertFalse(order.isPaid()); // không xử lý tiền
    }

    @Test
    void fail_withoutReason_isRejected() {
        outForDelivery();
        ApiException ex = assertThrows(ApiException.class, () -> service.fail(8L, 5L, "  "));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals(Delivery.STATUS_OUT_FOR_DELIVERY, delivery.getDeliveryStatus());
    }

    @Test
    void fail_beforePickup_isRejected() {
        ApiException ex = assertThrows(ApiException.class, () -> service.fail(8L, 5L, "Sai địa chỉ"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void fail_byAnotherWaiter_isForbidden() {
        outForDelivery();
        ApiException ex = assertThrows(ApiException.class, () -> service.fail(8L, 6L, "Sai địa chỉ"));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void fail_afterDelivered_isRejected() {
        outForDelivery();
        order.setPaymentStatus(Order.PAID);
        service.deliver(8L, 5L);
        ApiException ex = assertThrows(ApiException.class, () -> service.fail(8L, 5L, "Sai địa chỉ"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(Order.SERVED, order.getStatus());
    }

    @Test
    void myDeliveries_listsOrdersHeldByWaiter() {
        delivery.setOrder(order);
        when(deliveryRepository.findByAssignedWaiter_IdAndDeliveryStatusInOrderByAssignedAtAsc(5L, DeliveryService.HOLDING))
                .thenReturn(List.of(delivery));

        var list = service.myDeliveries(5L);
        assertEquals(1, list.size());
        assertEquals(8L, list.get(0).orderId());
        assertEquals("Trần Bình", list.get(0).assignedWaiterName());
    }
}
