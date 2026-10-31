package com.example.project.service;

import com.example.project.dto.refund.RefundCompleteRequest;
import com.example.project.dto.refund.RefundItemsRequest;
import com.example.project.dto.refund.RefundView;
import com.example.project.entity.Customer;
import com.example.project.entity.Delivery;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.LoyaltyTransaction;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.CustomerRepository;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.LoyaltyTransactionRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.PaymentRepository;
import com.example.project.repository.RefundRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.*;

/**
 * Hoàn tiền (ThangNN Iter3, Template 6 "Refund and Loyalty Reversal").
 * Chạy riêng: mvn test -Dtest=RefundServiceTest
 */
class RefundServiceTest {

    private RefundRepository refundRepository;
    private PaymentRepository paymentRepository;
    private OrderRepository orderRepository;
    private OrderLockRepository lockRepository;
    private DeliveryRepository deliveryRepository;
    private LoyaltyTransactionRepository loyaltyRepository;
    private CustomerRepository customerRepository;
    private IncidentReportService incidentService;
    private OrderSupportService support;
    private RefundService service;
    private final User cashier = new User();
    private final List<LoyaltyTransaction> loyalty = new ArrayList<>();

    @BeforeEach
    void setUp() {
        refundRepository = mock(RefundRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        orderRepository = mock(OrderRepository.class);
        lockRepository = mock(OrderLockRepository.class);
        deliveryRepository = mock(DeliveryRepository.class);
        loyaltyRepository = mock(LoyaltyTransactionRepository.class);
        customerRepository = mock(CustomerRepository.class);
        incidentService = mock(IncidentReportService.class);
        support = mock(OrderSupportService.class);
        service = new RefundService(refundRepository, paymentRepository, orderRepository, lockRepository,
                deliveryRepository, loyaltyRepository, customerRepository, incidentService, support);
        cashier.setFullName("Nguyen Thu Nga");

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.countByPaymentCodeStartingWith(anyString())).thenReturn(0L);
        when(refundRepository.findSessionIdOfOrder(anyLong())).thenReturn(Optional.empty());
        when(refundRepository.sumRefundsOf(anyLong())).thenReturn(0L);
        when(refundRepository.findQrReferences(anyLong())).thenReturn(List.of());
        when(loyaltyRepository.findByPayment_Id(5L)).thenReturn(loyalty);
    }

    // ===== Tính tiền / điểm =====

    @Test
    void refundIsProportionalToWhatTheCustomerActuallyPaid() {
        // Hóa đơn 100.000đ, dùng điểm giảm 10.000đ -> khách trả 90.000đ. Bỏ món 30.000đ -> hoàn 27.000đ.
        assertEquals(27000L, RefundService.refundAmount(90000, 30000, 100000));
        // Hoàn hết món còn lại -> trả hết số còn lại (không lệch vì làm tròn).
        assertEquals(63000L, RefundService.refundAmount(63000, 70000, 70000));
        assertEquals(0L, RefundService.refundAmount(0, 30000, 30000));
    }

    @Test
    void earnedPointsAreTakenBackForTheRefundedPart() {
        // Cộng 9 điểm cho 90.000đ; còn trả 63.000đ -> giữ 6 điểm, trừ 3.
        assertEquals(3, RefundService.pointsToTakeBack(9, 0, 90000, 63000));
        // Lần hoàn sau (đã trừ 3): hoàn nốt -> trừ 6 còn lại.
        assertEquals(6, RefundService.pointsToTakeBack(9, 3, 90000, 0));
        assertEquals(0, RefundService.pointsToTakeBack(0, 0, 90000, 0));
    }

    // ===== Đơn tại quầy =====

    @Test
    void cashRefundCancelsItemsAndTakesBackEarnedPoints() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.PENDING, 30000);
        OrderItem tea = item(2, "Trà đào", OrderItem.SERVED, 70000);
        Order o = paidTakeaway(90000, latte, tea);
        Customer c = customerWithPoints(20, 9, 10); // cộng 9 điểm, đã dùng 10 điểm

        RefundView v = service.refundItems(10L, new RefundItemsRequest(List.of(1L), "Hết nguyên liệu", "CASH", 27000L), cashier);

        assertEquals(OrderItem.CANCELLED, latte.getItemStatus());
        assertEquals(70000L, o.getTotalAmount());
        assertEquals(27000L, v.amount());
        assertEquals(Payment.REFUNDED, v.status());
        assertTrue(v.refundCode().startsWith("RF"));
        assertTrue(v.note().contains("Bạc xỉu"));
        assertTrue(v.note().contains("Hết nguyên liệu"));
        assertEquals("PM261031-0005", v.paymentCode());

        ArgumentCaptor<LoyaltyTransaction> tx = ArgumentCaptor.forClass(LoyaltyTransaction.class);
        verify(loyaltyRepository).save(tx.capture());
        assertEquals(-3, tx.getValue().getPointsChange());
        assertEquals(LoyaltyTransaction.REFUND, tx.getValue().getTransactionType());
        assertEquals(17, c.getCurrentPoints());
        verifyNoInteractions(incidentService);
    }

    @Test
    void transferRefundWaitsForBankReferenceAndReadyItemFilesIncident() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.READY, 30000);
        OrderItem tea = item(2, "Trà đào", OrderItem.PENDING, 70000);
        paidTakeaway(100000, latte, tea);

        RefundView v = service.refundItems(10L, new RefundItemsRequest(List.of(1L), "Khách đổi ý", "BANK_TRANSFER", null), cashier);

        assertEquals(Payment.REFUND_PENDING, v.status());
        assertEquals(30000L, v.amount());
        verify(incidentService).create(eq(latte), eq(cashier), eq(IncidentReport.CANCEL), startsWith(RefundService.INCIDENT_PREFIX));
    }

    @Test
    void refundingEverythingLeftReturnsRemainingMoneyAndRedeemedPoints() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.PENDING, 30000);
        OrderItem tea = item(2, "Trà đào", OrderItem.PENDING, 70000);
        Order o = paidTakeaway(90000, latte, tea);
        Customer c = customerWithPoints(20, 9, 10);

        RefundView v = service.refundItems(10L, new RefundItemsRequest(List.of(1L, 2L), "Hết nguyên liệu", "CASH", null), cashier);

        assertEquals(90000L, v.amount());
        assertTrue(o.isCancelled());
        assertEquals("Hoàn tiền: Hết nguyên liệu", o.getCancelReason());
        assertEquals(20 + 10 - 9, c.getCurrentPoints()); // trả lại 10 điểm đã dùng, trừ 9 điểm đã cộng
        verify(loyaltyRepository, times(2)).save(any(LoyaltyTransaction.class));
    }

    @Test
    void earnedPointsAreNotTakenBelowZero() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.PENDING, 100000);
        paidTakeaway(100000, latte);
        Customer c = customerWithPoints(4, 10, 0); // đã tiêu bớt, chỉ còn 4 điểm

        service.refundItems(10L, new RefundItemsRequest(List.of(1L), "Hết nguyên liệu", "CASH", null), cashier);

        assertEquals(0, c.getCurrentPoints());
    }

    @Test
    void secondRefundOnlyGivesBackWhatIsLeft() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.PENDING, 30000);
        OrderItem tea = item(2, "Trà đào", OrderItem.PENDING, 70000);
        paidTakeaway(90000, latte, tea);
        latte.setItemStatus(OrderItem.CANCELLED); // đã hoàn 27.000đ ở lần trước
        when(refundRepository.sumRefundsOf(5L)).thenReturn(27000L);

        RefundView v = service.refundItems(10L, new RefundItemsRequest(List.of(2L), "Khách đổi ý", "CASH", null), cashier);

        assertEquals(63000L, v.amount());
    }

    @Test
    void servedUnpaidAndOnlineOrdersAreRejected() {
        OrderItem tea = item(2, "Trà đào", OrderItem.SERVED, 70000);
        Order o = paidTakeaway(70000, tea);
        assertThrows(ApiException.class, () -> service.refundItems(10L,
                new RefundItemsRequest(List.of(2L), "Khách đổi ý", "CASH", null), cashier));

        tea.setItemStatus(OrderItem.PENDING);
        o.setPaymentStatus(Order.UNPAID);
        assertThrows(ApiException.class, () -> service.refundItems(10L,
                new RefundItemsRequest(List.of(2L), "Khách đổi ý", "CASH", null), cashier));

        o.setPaymentStatus(Order.PAID);
        o.setFulfillmentType(Order.DELIVERY);
        assertThrows(ApiException.class, () -> service.refundItems(10L,
                new RefundItemsRequest(List.of(2L), "Khách đổi ý", "CASH", null), cashier));
        assertEquals(OrderItem.PENDING, tea.getItemStatus());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void reasonIsRequiredAndChangedAmountIsRejected() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.PENDING, 30000);
        OrderItem tea = item(2, "Trà đào", OrderItem.PENDING, 70000);
        paidTakeaway(100000, latte, tea);

        assertThrows(ApiException.class, () -> service.refundItems(10L,
                new RefundItemsRequest(List.of(1L), "  ", "CASH", null), cashier));
        ApiException e = assertThrows(ApiException.class, () -> service.refundItems(10L,
                new RefundItemsRequest(List.of(1L), "Hết nguyên liệu", "CASH", 25000L), cashier));
        assertEquals(409, e.getStatus().value());
        assertEquals(OrderItem.PENDING, latte.getItemStatus());
    }

    // ===== Đơn online =====

    @Test
    void cancellingPaidOnlineOrderBeforePickUpCreatesPendingTransferRefund() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.PENDING, 30000);
        Order o = paidTakeaway(30000, latte);
        o.setFulfillmentType(Order.DELIVERY);
        o.setStatus(Order.CONFIRMED);
        Delivery d = new Delivery(o, "12 Nguyễn Trãi, Hà Nội");
        d.setDeliveryStatus(Delivery.STATUS_ASSIGNED);
        when(deliveryRepository.findByOrder_Id(10L)).thenReturn(Optional.of(d));

        RefundView v = service.cancelDeliveryAndRefund(10L, "Hết nguyên liệu", cashier);

        assertTrue(o.isCancelled());
        assertEquals(Delivery.STATUS_CANCELLED, d.getDeliveryStatus());
        assertEquals(30000L, v.amount());
        assertEquals(Payment.REFUND_PENDING, v.status());
        assertEquals(Payment.BANK_TRANSFER, v.method());
    }

    @Test
    void onlineOrderOutForDeliveryCannotBeCancelled() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.READY, 30000);
        Order o = paidTakeaway(30000, latte);
        o.setFulfillmentType(Order.DELIVERY);
        o.setStatus(Order.READY);
        Delivery d = new Delivery(o, "12 Nguyễn Trãi, Hà Nội");
        d.setDeliveryStatus(Delivery.STATUS_OUT_FOR_DELIVERY);
        when(deliveryRepository.findByOrder_Id(10L)).thenReturn(Optional.of(d));

        ApiException e = assertThrows(ApiException.class, () -> service.cancelDeliveryAndRefund(10L, "Khách hủy", cashier));
        assertEquals(409, e.getStatus().value());
        assertFalse(o.isCancelled());
    }

    @Test
    void failedDeliveryGetsFullRefundOnlyOnce() {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.CANCELLED, 30000);
        Order o = paidTakeaway(30000, latte);
        o.setFulfillmentType(Order.DELIVERY);
        o.setStatus(Order.CANCELLED);
        o.setCancelReason("Giao không thành công: khách không nghe máy");

        RefundView v = service.refundCancelledDelivery(10L, null, cashier);
        assertEquals(30000L, v.amount());
        assertTrue(v.note().contains("khách không nghe máy"));

        when(refundRepository.sumRefundsOf(5L)).thenReturn(30000L);
        assertThrows(ApiException.class, () -> service.refundCancelledDelivery(10L, null, cashier));
    }

    // ===== Chờ chuyển khoản -> đã hoàn =====

    @Test
    void completingPendingRefundStoresBankReference() {
        Payment r = refundRow(Payment.REFUND_PENDING);

        RefundView v = service.complete(99L, new RefundCompleteRequest(" FT26304123 "), cashier);

        assertEquals(Payment.REFUNDED, v.status());
        assertNotNull(v.refundedAt());
        assertTrue(r.getNote().contains("FT26304123"));
        assertThrows(ApiException.class, () -> service.complete(99L, new RefundCompleteRequest("FT1"), cashier));
        assertThrows(ApiException.class, () -> service.complete(99L, new RefundCompleteRequest(" "), cashier));
    }

    // ===== Dựng dữ liệu =====

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

    /** Đơn mang đi id 10 đã thu bằng hóa đơn id 5 (khách trả paid). */
    private Order paidTakeaway(long paid, OrderItem... items) {
        Order o = new Order();
        ReflectionTestUtils.setField(o, "id", 10L);
        o.setOrderNumber("261031-0007");
        o.setFulfillmentType(Order.PICKUP);
        o.setStatus(Order.PENDING);
        for (OrderItem i : items) {
            i.setOrder(o);
            o.getItems().add(i);
        }
        o.recalcTotal();
        Payment p = new Payment();
        ReflectionTestUtils.setField(p, "id", 5L);
        p.setPaymentCode("PM261031-0005");
        p.setPaymentMethod(Payment.CASH);
        p.setTotalAmount(paid);
        p.setPaymentStatus(Payment.PAID);
        p.setOrder(o);
        o.markPaid(p);
        when(lockRepository.findWithLockById(10L)).thenReturn(Optional.of(o));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(o));
        when(orderRepository.findByPayment_IdOrderByCreatedAtAsc(5L)).thenReturn(List.of(o));
        return o;
    }

    /** Khách thân thiết của hóa đơn 5: đang có points điểm, hóa đơn đã cộng earned và dùng redeemed điểm. */
    private Customer customerWithPoints(int points, int earned, int redeemed) {
        Customer c = new Customer();
        c.setFullName("Lan");
        c.setCurrentPoints(points);
        Payment p = new Payment();
        ReflectionTestUtils.setField(p, "id", 5L);
        if (earned > 0) loyalty.add(LoyaltyTransaction.of(c, p, null, earned, LoyaltyTransaction.EARN, "Tích điểm"));
        if (redeemed > 0) loyalty.add(LoyaltyTransaction.of(c, p, null, -redeemed, LoyaltyTransaction.REDEEM, "Dùng điểm"));
        return c;
    }

    private Payment refundRow(String status) {
        OrderItem latte = item(1, "Bạc xỉu", OrderItem.CANCELLED, 30000);
        Order o = paidTakeaway(30000, latte);
        Payment r = new Payment();
        ReflectionTestUtils.setField(r, "id", 99L);
        r.setPaymentCode("RF261031-0001");
        r.setPaymentMethod(Payment.BANK_TRANSFER);
        r.setTotalAmount(30000L);
        r.setPaymentStatus(status);
        r.setOrder(o);
        r.setNote("Món: 1× Bạc xỉu (30.000đ). Lý do: Hết nguyên liệu.");
        when(refundRepository.findRefundWithLockById(99L)).thenReturn(Optional.of(r));
        return r;
    }
}
