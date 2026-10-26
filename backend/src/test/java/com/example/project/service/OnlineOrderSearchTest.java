package com.example.project.service;

import com.example.project.entity.Order;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

/**
 * Ship Order List: thu ngân tìm đơn giao hàng theo thời gian đặt đơn và / hoặc mã đơn.
 * Chạy riêng: mvn test -Dtest=OnlineOrderSearchTest
 */
class OnlineOrderSearchTest {

    private OrderRepository orderRepository;
    private OnlineOrderService service;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        service = new OnlineOrderService(orderRepository, mock(DeliveryRepository.class),
                mock(OrderSupportService.class), mock(OrderLockRepository.class));
    }

    @Test
    void noFilters_listsAllDeliveryOrdersAsBefore() {
        service.listDeliveryOrders(null, null, "  ");

        verify(orderRepository).findByFulfillmentTypeOrderByCreatedAtDesc(Order.DELIVERY);
        verify(orderRepository, never()).searchByFulfillmentType(any(), any(), any(), any());
    }

    @Test
    void codeIsNormalized() {
        service.listDeliveryOrders(null, null, " #261025-0012 ");

        verify(orderRepository).searchByFulfillmentType(eq(Order.DELIVERY), isNull(), isNull(), eq("261025-0012"));
    }

    @Test
    void timeRangeAndCodeArePassedThrough() {
        LocalDateTime from = LocalDateTime.of(2026, 10, 20, 8, 0);
        LocalDateTime to = LocalDateTime.of(2026, 10, 25, 23, 59);

        service.listDeliveryOrders(from, to, "0012");

        verify(orderRepository).searchByFulfillmentType(Order.DELIVERY, from, to, "0012");
    }

    @Test
    void onlyFrom_searchesUntilNow() {
        LocalDateTime from = LocalDateTime.of(2026, 10, 20, 8, 0);

        service.listDeliveryOrders(from, null, null);

        verify(orderRepository).searchByFulfillmentType(eq(Order.DELIVERY), eq(from), isNull(), isNull());
    }

    @Test
    void invalidInput_isRejected() {
        LocalDateTime t = LocalDateTime.of(2026, 10, 20, 8, 0);
        assertThrows(ApiException.class, () -> service.listDeliveryOrders(t, t, null));
        assertThrows(ApiException.class, () -> service.listDeliveryOrders(t.plusHours(1), t, null));
        assertThrows(ApiException.class, () -> service.listDeliveryOrders(null, null, "abc%"));
        verifyNoInteractions(orderRepository);
    }
}
