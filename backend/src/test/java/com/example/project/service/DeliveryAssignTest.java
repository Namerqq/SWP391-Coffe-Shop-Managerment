package com.example.project.service;

import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
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

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Iter 3: thu ngân gán phục vụ đi giao (DeliveryService.assign).
 * Chạy riêng: mvn test -Dtest=DeliveryAssignTest
 */
class DeliveryAssignTest {

    private DeliveryRepository deliveryRepository;
    private UserRepository userRepository;
    private DeliveryService service;
    private Order order;
    private Delivery delivery;
    private User waiterA;
    private User waiterB;

    @BeforeEach
    void setUp() {
        OrderLockRepository lockRepository = mock(OrderLockRepository.class);
        deliveryRepository = mock(DeliveryRepository.class);
        userRepository = mock(UserRepository.class);
        OnlineOrderService online = new OnlineOrderService(mock(OrderRepository.class), deliveryRepository,
                mock(OrderSupportService.class), lockRepository);
        service = new DeliveryService(lockRepository, deliveryRepository, userRepository, online);

        order = new Order();
        ReflectionTestUtils.setField(order, "id", 8L);
        order.setOrderNumber("261030-0008");
        order.setSource(Order.SOURCE_ONLINE);
        order.setFulfillmentType(Order.DELIVERY);
        order.setStatus(Order.CONFIRMED);
        delivery = new Delivery();
        delivery.setDeliveryAddress("12 Nguyễn Trãi, Hà Nội");
        delivery.setDeliveryStatus(Delivery.STATUS_PENDING_ASSIGNMENT);

        waiterA = user(5L, "Trần Bình", "WAITER", User.ACTIVE);
        waiterB = user(6L, "Lê Châu", "WAITER", User.ACTIVE);

        when(lockRepository.findWithLockById(8L)).thenReturn(Optional.of(order));
        when(deliveryRepository.findByOrder_Id(8L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(5L)).thenReturn(Optional.of(waiterA));
        when(userRepository.findById(6L)).thenReturn(Optional.of(waiterB));
    }

    private static User user(Long id, String name, String roleName, String status) {
        Role role = new Role();
        role.setName(roleName);
        User u = new User();
        ReflectionTestUtils.setField(u, "id", id);
        u.setFullName(name);
        u.setRole(role);
        u.setStatus(status);
        return u;
    }

    @Test
    void assignConfirmedOrder_setsWaiterTimeAndStatus() {
        OnlineOrderView v = service.assign(8L, 5L);

        assertSame(waiterA, delivery.getAssignedWaiter());
        assertNotNull(delivery.getAssignedAt());
        assertEquals(Delivery.STATUS_ASSIGNED, delivery.getDeliveryStatus());
        assertEquals("Trần Bình", v.assignedWaiterName());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void readyOrderCanBeAssigned() {
        order.setStatus(Order.READY);
        service.assign(8L, 5L);
        assertEquals(Delivery.STATUS_ASSIGNED, delivery.getDeliveryStatus());
    }

    @Test
    void reassignBeforePickup_changesWaiter() {
        service.assign(8L, 5L);
        service.assign(8L, 6L);
        assertSame(waiterB, delivery.getAssignedWaiter());
        assertEquals(Delivery.STATUS_ASSIGNED, delivery.getDeliveryStatus());
    }

    @Test
    void assignSameWaiterAgain_keepsAssignedTime() {
        LocalDateTime first = LocalDateTime.of(2026, 10, 30, 9, 0);
        delivery.setAssignedWaiter(waiterA);
        delivery.setAssignedAt(first);
        delivery.setDeliveryStatus(Delivery.STATUS_ASSIGNED);

        service.assign(8L, 5L);
        assertEquals(first, delivery.getAssignedAt());
        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void pendingOrder_isRejected() {
        order.setStatus(Order.PENDING);
        ApiException ex = assertThrows(ApiException.class, () -> service.assign(8L, 5L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("chưa được xác nhận"));
        assertNull(delivery.getAssignedWaiter());
    }

    @Test
    void cancelledOrder_isRejected() {
        order.setStatus(Order.CANCELLED);
        ApiException ex = assertThrows(ApiException.class, () -> service.assign(8L, 5L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã bị hủy"));
    }

    @Test
    void afterPickup_cannotChangeWaiter() {
        delivery.setAssignedWaiter(waiterA);
        delivery.setDeliveryStatus(Delivery.STATUS_OUT_FOR_DELIVERY);
        ApiException ex = assertThrows(ApiException.class, () -> service.assign(8L, 6L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertSame(waiterA, delivery.getAssignedWaiter());
    }

    @Test
    void notAWaiter_isRejected() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(user(7L, "Thu Ngân", "CASHIER", User.ACTIVE)));
        ApiException ex = assertThrows(ApiException.class, () -> service.assign(8L, 7L));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertNull(delivery.getAssignedWaiter());
    }

    @Test
    void lockedWaiter_isRejected() {
        waiterA.setStatus(User.LOCKED);
        ApiException ex = assertThrows(ApiException.class, () -> service.assign(8L, 5L));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void notADeliveryOrder_isNotFound() {
        order.setFulfillmentType(Order.PICKUP);
        ApiException ex = assertThrows(ApiException.class, () -> service.assign(8L, 5L));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }
}
