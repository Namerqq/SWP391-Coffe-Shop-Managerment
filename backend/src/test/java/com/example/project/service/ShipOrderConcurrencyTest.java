package com.example.project.service;

import com.example.project.entity.Order;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Ship Order List: 2 thu ngân bấm xác nhận / hủy cùng 1 đơn giao hàng -> chỉ người bấm trước có hiệu lực.
 * (Khóa dòng thật do MySQL làm; ở đây kiểm tra người sau đọc lại trạng thái mới thì bị từ chối, không ghi đè.)
 * Chạy riêng: mvn test -Dtest=ShipOrderConcurrencyTest
 */
class ShipOrderConcurrencyTest {

    private OrderRepository orderRepository;
    private DeliveryRepository deliveryRepository;
    private OrderLockRepository lockRepository;
    private OnlineOrderService service;
    private Order order;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        deliveryRepository = mock(DeliveryRepository.class);
        lockRepository = mock(OrderLockRepository.class);
        service = new OnlineOrderService(orderRepository, deliveryRepository, mock(OrderSupportService.class), lockRepository);

        order = new Order();
        ReflectionTestUtils.setField(order, "id", 8L);
        order.setOrderNumber("261023-0008");
        order.setSource(Order.SOURCE_ONLINE);
        order.setFulfillmentType(Order.DELIVERY);
        order.setStatus(Order.PENDING);
        when(lockRepository.findWithLockById(8L)).thenReturn(Optional.of(order));
        when(deliveryRepository.findByOrder_Id(8L)).thenReturn(Optional.empty());
    }

    @Test
    void confirmThenCancel_secondClickIsRejectedAndOrderStaysConfirmed() {
        service.confirmDeliveryOrder(8L);                       // thu ngân A bấm trước
        assertEquals(Order.CONFIRMED, order.getStatus());

        ApiException ex = assertThrows(ApiException.class,     // thu ngân B bấm sau (màn hình cũ)
                () -> service.cashierCancelDeliveryOrder(8L, "Hết nguyên liệu"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã được xác nhận"));
        assertEquals(Order.CONFIRMED, order.getStatus());      // không bị ghi đè thành Đã hủy
        assertNull(order.getCancelReason());
        verify(orderRepository, times(1)).save(any());
    }

    @Test
    void cancelThenConfirm_secondClickIsRejectedAndOrderStaysCancelled() {
        service.cashierCancelDeliveryOrder(8L, "Hết nguyên liệu");
        assertEquals(Order.CANCELLED, order.getStatus());

        ApiException ex = assertThrows(ApiException.class, () -> service.confirmDeliveryOrder(8L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã bị hủy"));
        assertEquals(Order.CANCELLED, order.getStatus());       // không bị ghi đè thành Đã xác nhận
        verify(orderRepository, times(1)).save(any());
    }

    @Test
    void confirmTwice_secondIsRejected() {
        service.confirmDeliveryOrder(8L);
        assertThrows(ApiException.class, () -> service.confirmDeliveryOrder(8L));
        verify(orderRepository, times(1)).save(any());
    }

    @Test
    void readsOrderWithRowLock() {
        service.confirmDeliveryOrder(8L);
        verify(lockRepository).findWithLockById(8L);
        verify(orderRepository, never()).findById(any());
    }
}
