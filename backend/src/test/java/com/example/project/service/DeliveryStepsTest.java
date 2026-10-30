package com.example.project.service;

import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Role;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Iter 3: các bước phục vụ bấm khi đi giao (lấy hàng, giao xong, giao lỗi).
 * Chạy riêng: mvn test -Dtest=DeliveryStepsTest
 */
class DeliveryStepsTest {

    private DeliveryRepository deliveryRepository;
    private OrderRepository orderRepository;
    private DeliveryService service;
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

        order = new Order();
        ReflectionTestUtils.setField(order, "id", 8L);
        order.setOrderNumber("261030-0008");
        order.setSource(Order.SOURCE_ONLINE);
        order.setFulfillmentType(Order.DELIVERY);
        order.setStatus(Order.READY);

        Role role = new Role();
        role.setName("WAITER");
        User waiter = new User();
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
    void deliver_marksDeliveredAndCompletes_withoutPayment() {
        outForDelivery();
        service.deliver(8L, 5L);

        assertEquals(Delivery.STATUS_DELIVERED, delivery.getDeliveryStatus());
        assertNotNull(delivery.getDeliveredAt());
        assertEquals(Order.SERVED, order.getStatus());
        assertEquals(OrderItem.SERVED, order.getItems().get(0).getItemStatus());
        assertNotNull(order.getCompletedAt());
        assertFalse(order.isPaid()); // không ghi thanh toán
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
        service.deliver(8L, 5L);
        ApiException ex = assertThrows(ApiException.class, () -> service.deliver(8L, 5L));
        assertTrue(ex.getMessage().contains("đã giao xong"));
    }
}
