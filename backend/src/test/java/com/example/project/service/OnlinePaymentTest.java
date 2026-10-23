package com.example.project.service;

import com.example.project.dto.cashier.QrPaymentView;
import com.example.project.dto.cashier.QrTakeawayCart;
import com.example.project.dto.onlinepay.OnlineQrRequest;
import com.example.project.dto.onlinepay.QrOnlineCart;
import com.example.project.dto.order.OrderItemRequest;
import com.example.project.entity.Category;
import com.example.project.entity.Delivery;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import com.example.project.entity.QrPaymentRequest;
import com.example.project.exception.ApiException;
import com.example.project.payos.PayosClient;
import com.example.project.repository.CustomerRepository;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.QrPaymentRequestRepository;
import com.example.project.repository.TableSessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ThangNN Iter2: thanh toán QR cho khách đặt online (QrPaymentService). Khách online không tích / dùng điểm.
 * Chạy riêng: mvn test -Dtest=OnlinePaymentTest
 */
class OnlinePaymentTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private QrPaymentRequestRepository qrRepository;
    private OrderRepository orderRepository;
    private CustomerRepository customerRepository;
    private MenuItemRepository menuItemRepository;
    private CashierService cashier;
    private OrderSupportService support;
    private SystemSettingService settings;
    private PayosClient payos;
    private DeliveryRepository deliveryRepository;
    private QrPaymentService service;

    private MenuItem bacXiu;

    @BeforeEach
    void setUp() {
        qrRepository = mock(QrPaymentRequestRepository.class);
        orderRepository = mock(OrderRepository.class);
        customerRepository = mock(CustomerRepository.class);
        menuItemRepository = mock(MenuItemRepository.class);
        cashier = mock(CashierService.class);
        support = mock(OrderSupportService.class);
        settings = mock(SystemSettingService.class);
        payos = mock(PayosClient.class);
        deliveryRepository = mock(DeliveryRepository.class);
        service = new QrPaymentService(qrRepository, mock(TableSessionRepository.class), orderRepository,
                mock(OrderLockRepository.class), customerRepository, menuItemRepository, cashier, support, settings,
                payos, objectMapper, deliveryRepository);

        when(settings.getLong(anyString(), anyLong())).thenAnswer(inv -> inv.getArgument(1));
        when(settings.qrTimeoutMinutes()).thenReturn(15L);
        when(payos.isConfigured()).thenReturn(true);

        bacXiu = new MenuItem();
        ReflectionTestUtils.setField(bacXiu, "id", 1L);
        ReflectionTestUtils.setField(bacXiu, "name", "Bạc xỉu");
        ReflectionTestUtils.setField(bacXiu, "basePrice", 29000L);
        ReflectionTestUtils.setField(bacXiu, "category", new Category());
    }

    private OrderItem line(int qty) {
        OrderItem i = new OrderItem();
        i.setMenuItem(bacXiu);
        i.setQuantity(qty);
        i.setUnitPrice(bacXiu.getBasePrice());
        i.setSizePrice(0L);
        i.setToppingPrice(0L);
        i.setItemStatus(OrderItem.PENDING);
        i.recalcSubtotal();
        return i;
    }

    private OnlineQrRequest request(String phone) {
        return new OnlineQrRequest("An", phone, " 12 Cầu Giấy ", null,
                List.of(new OrderItemRequest(1L, 2, null, List.of(), null, null, null)));
    }

    // ===== createForOnline =====

    @Test
    void createForOnline_fullPriceNoLoyaltyAndCreatesNoOrder() {
        when(support.buildItem(any())).thenReturn(line(2)); // 2 x 29.000 = 58.000
        when(payos.createOnlineLink(anyLong(), eq(58000L), anyString(), anyLong()))
                .thenReturn(new PayosClient.CreatedLink("link-1", "QRDATA", "https://pay.payos.vn/link-1", "PENDING"));

        assertEquals("link-1", service.createForOnline(request("0901111111")));

        ArgumentCaptor<QrPaymentRequest> saved = ArgumentCaptor.forClass(QrPaymentRequest.class);
        verify(qrRepository).save(saved.capture());
        QrPaymentRequest r = saved.getValue();
        assertEquals(QrPaymentRequest.ONLINE, r.getTargetType());
        assertNull(r.getCreatedBy());
        assertNull(r.getCustomer());            // không gắn khách thân thiết
        assertEquals(58000L, r.getSubtotal());
        assertEquals(58000L, r.getAmount());    // không giảm bằng điểm
        assertEquals(0, r.getPointsToRedeem());
        verifyNoInteractions(customerRepository); // không tra / tạo thành viên
        verify(payos, never()).createLink(anyLong(), anyLong(), anyString(), anyLong());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void createForOnline_rejectsInvalidPhone() {
        assertThrows(ApiException.class, () -> service.createForOnline(request("12345")));
        verify(payos, never()).createOnlineLink(anyLong(), anyLong(), anyString(), anyLong());
    }

    // ===== applyPaid -> settleOnline =====

    @Test
    void applyPaid_onlineRequest_createsConfirmedDeliveryOrder() throws Exception {
        QrPaymentRequest r = new QrPaymentRequest();
        ReflectionTestUtils.setField(r, "id", 7L);
        r.setTargetType(QrPaymentRequest.ONLINE);
        r.setSubtotal(58000L);
        r.setAmount(58000L);
        r.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        r.setCartJson(objectMapper.writeValueAsString(new QrOnlineCart("An", "0901111111", "12 Cầu Giấy", "gọi trước",
                List.of(QrTakeawayCart.Line.of(line(2))))));
        when(qrRepository.findWithLockById(7L)).thenReturn(Optional.of(r));
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(bacXiu));
        when(support.nextOrderNumber()).thenReturn("261017-0001");

        QrPaymentView view = service.applyPaid(7L, "WEBHOOK", "FT123");

        assertEquals(QrPaymentRequest.PAID, view.status());
        ArgumentCaptor<Order> order = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, atLeastOnce()).save(order.capture());
        Order o = order.getValue();
        assertEquals(Order.SOURCE_ONLINE, o.getSource());
        assertEquals(Order.DELIVERY, o.getFulfillmentType());
        assertEquals(Order.CONFIRMED, o.getStatus());
        assertEquals(Order.PAID, o.getPaymentStatus());
        assertEquals("0901111111", o.getCustomerPhone());
        assertNull(o.getCustomer());
        assertEquals(58000L, (long) o.getTotalAmount());
        verify(cashier).record(any(Payment.class), eq(58000L), eq(0L), eq(0), eq(Payment.BANK_TRANSFER),
                isNull(), isNull(), isNull());
        ArgumentCaptor<Delivery> delivery = ArgumentCaptor.forClass(Delivery.class);
        verify(deliveryRepository).save(delivery.capture());
        assertEquals("12 Cầu Giấy", delivery.getValue().getDeliveryAddress());
        assertEquals(Delivery.STATUS_PENDING_ASSIGNMENT, delivery.getValue().getDeliveryStatus());
    }

    // ===== Màn Thu ngân (Q2-A, D5-A) =====

    @Test
    void pending_hidesOnlineRequestsFromCashier() {
        QrPaymentRequest online = new QrPaymentRequest();
        ReflectionTestUtils.setField(online, "id", 1L);
        online.setTargetType(QrPaymentRequest.ONLINE);
        online.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        QrPaymentRequest takeaway = new QrPaymentRequest();
        ReflectionTestUtils.setField(takeaway, "id", 2L);
        takeaway.setTargetType(QrPaymentRequest.TAKEAWAY);
        takeaway.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        when(qrRepository.findByStatusOrderByCreatedAtAsc(QrPaymentRequest.PENDING)).thenReturn(List.of(online, takeaway));

        List<QrPaymentView> list = service.pending(null, null);

        assertEquals(1, list.size());
        assertEquals(2L, (long) list.get(0).id());
    }

    @Test
    void renew_onlineRequest_isRejected() {
        QrPaymentRequest online = new QrPaymentRequest();
        ReflectionTestUtils.setField(online, "id", 1L);
        online.setTargetType(QrPaymentRequest.ONLINE);
        online.moveTo(QrPaymentRequest.EXPIRED, "Hết thời gian chờ.");
        when(qrRepository.findById(1L)).thenReturn(Optional.of(online));
        assertThrows(ApiException.class, () -> service.renew(1L, null));
    }
}
