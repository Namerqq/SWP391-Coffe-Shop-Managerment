package com.example.project.service;

import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
import com.example.project.entity.User;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Mã đơn online dễ đoán: tra / hủy bằng mã chỉ thấy tên, SĐT, địa chỉ đã che.
 * Chạy riêng: mvn test -Dtest=OnlineOrderPrivacyTest
 */
class OnlineOrderPrivacyTest {

    private OrderRepository orderRepository;
    private OnlineOrderService service;
    private Order order;
    private Delivery delivery;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
        OrderLockRepository lockRepository = mock(OrderLockRepository.class);
        service = new OnlineOrderService(orderRepository, deliveryRepository, mock(OrderSupportService.class), lockRepository);

        order = new Order();
        ReflectionTestUtils.setField(order, "id", 8L);
        order.setOrderNumber("261026-0008");
        order.setSource(Order.SOURCE_ONLINE);
        order.setFulfillmentType(Order.DELIVERY);
        order.setStatus(Order.PENDING);
        order.setCustomerName("Nguyễn Văn An");
        order.setCustomerPhone("0901234567");
        delivery = new Delivery();
        delivery.setDeliveryAddress("12 Nguyễn Trãi, Thanh Xuân, Hà Nội");
        delivery.setDeliveryStatus(Delivery.STATUS_PENDING_ASSIGNMENT);

        when(orderRepository.findFirstByOrderNumberAndSourceOrderByIdDesc("261026-0008", Order.SOURCE_ONLINE))
                .thenReturn(Optional.of(order));
        when(lockRepository.findFirstWithLockByOrderNumberAndSourceOrderByIdDesc("261026-0008", Order.SOURCE_ONLINE))
                .thenReturn(Optional.of(order));
        when(deliveryRepository.findByOrder_Id(8L)).thenReturn(Optional.of(delivery));
    }

    @Test
    void lookupByCode_hidesNamePhoneAndAddress() {
        OnlineOrderView v = service.getOrderByCode("261026-0008");
        assertEquals("*** An", v.customerName());
        assertEquals("09*****567", v.customerPhone());
        assertEquals("***, Thanh Xuân, Hà Nội", v.deliveryAddress());
    }

    @Test
    void cancel_stillHidesInfo() {
        OnlineOrderView v = service.cancelOrder("261026-0008", "Đặt nhầm");
        assertEquals(Order.CANCELLED, order.getStatus());
        assertEquals("Đặt nhầm", order.getCancelReason());
        assertEquals("09*****567", v.customerPhone());
    }

    @Test
    void lookupByCode_showsWaiterAndDeliveryTimes() {
        User waiter = new User();
        waiter.setFullName("Trần Bình");
        LocalDateTime at = LocalDateTime.of(2026, 10, 30, 9, 15);
        delivery.setAssignedWaiter(waiter);
        delivery.setAssignedAt(at);

        OnlineOrderView v = service.getOrderByCode("261026-0008");
        assertEquals("Trần Bình", v.assignedWaiterName());
        assertEquals(at, v.assignedAt());
        assertNull(v.deliveredAt());
        assertNull(v.failureReason());
    }

    @Test
    void notAssignedYet_waiterIsNull() {
        assertNull(service.getOrderByCode("261026-0008").assignedWaiterName());
    }

    @Test
    void maskHelpers() {
        assertEquals("A***", OnlineOrderService.maskName("An"));
        assertEquals("***", OnlineOrderService.maskAddress("Ký túc xá khu B"));
        assertNull(OnlineOrderService.maskPhone(null));
    }
}
