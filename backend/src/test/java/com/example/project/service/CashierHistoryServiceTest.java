package com.example.project.service;

import com.example.project.dto.cashier.OrderHistoryView;
import com.example.project.entity.Order;
import com.example.project.entity.Payment;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.CashierHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * UC-C15 View Bills History (ThangNN Iter3): lịch sử đơn theo ngày của Thu ngân.
 * Chạy riêng: mvn test -Dtest=CashierHistoryServiceTest
 */
class CashierHistoryServiceTest {

    private CashierHistoryRepository repository;
    private OrderSupportService support;
    private CashierHistoryService service;

    @BeforeEach
    void setUp() {
        repository = mock(CashierHistoryRepository.class);
        support = mock(OrderSupportService.class);
        service = new CashierHistoryService(repository, support); // support.toView trả null: chỉ kiểm tra phần hóa đơn
    }

    @Test
    void defaultsToTodayAndQueriesWholeDay() {
        OrderHistoryView v = service.history(null);

        LocalDate today = LocalDate.now();
        assertEquals(today, v.date());
        verify(repository).findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                today.atStartOfDay(), today.plusDays(1).atStartOfDay());
    }

    @Test
    void pastDateIsAllowed() {
        LocalDate day = LocalDate.of(2026, 10, 1);
        assertEquals(day, service.history(day).date());
        verify(repository).sumPaidByMethod(LocalDateTime.of(2026, 10, 1, 0, 0), LocalDateTime.of(2026, 10, 2, 0, 0));
    }

    @Test
    void futureDateIsRejected() {
        assertThrows(ApiException.class, () -> service.history(LocalDate.now().plusDays(1)));
        verifyNoInteractions(repository);
    }

    @Test
    void paidOrderCarriesBillInfoUnpaidOrderDoesNot() {
        User cashier = new User();
        cashier.setFullName("Nguyen Thu Nga");
        Payment payment = new Payment();
        ReflectionTestUtils.setField(payment, "id", 5L);
        ReflectionTestUtils.setField(payment, "paymentCode", "PM261024-0005");
        ReflectionTestUtils.setField(payment, "paymentMethod", Payment.CASH);
        ReflectionTestUtils.setField(payment, "confirmedBy", cashier);
        Order paid = new Order();
        ReflectionTestUtils.setField(paid, "payment", payment);
        Order unpaid = new Order();
        when(repository.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any()))
                .thenReturn(List.of(paid, unpaid));

        List<OrderHistoryView.Row> rows = service.history(null).orders();

        assertEquals(2, rows.size());
        assertEquals("PM261024-0005", rows.get(0).paymentCode());
        assertEquals(Payment.CASH, rows.get(0).paymentMethod());
        assertEquals("Nguyen Thu Nga", rows.get(0).cashierName());
        assertNull(rows.get(1).paymentCode());
        assertNull(rows.get(1).cashierName());
    }

    @Test
    void summarySplitsCashAndTransfer() {
        when(repository.sumPaidByMethod(any(), any())).thenReturn(List.of(
                new Object[]{Payment.CASH, 3L, 120000L},
                new Object[]{Payment.BANK_TRANSFER, 2L, 90000L}));

        OrderHistoryView.Summary s = service.history(null).summary();

        assertEquals(5, s.billCount());
        assertEquals(120000L, s.cash());
        assertEquals(90000L, s.transfer());
        assertEquals(210000L, s.total());
    }

    @Test
    void refundsGivenBackTodayAreTakenOutOfTheSameMethod() {
        when(repository.sumPaidByMethod(any(), any())).thenReturn(List.of(
                new Object[]{Payment.CASH, 3L, 120000L},
                new Object[]{Payment.BANK_TRANSFER, 2L, 90000L}));
        when(repository.sumRefundedByMethod(any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{Payment.CASH, 1L, 27000L}));

        OrderHistoryView.Summary s = service.history(null).summary();

        assertEquals(5, s.billCount());
        assertEquals(93000L, s.cash());
        assertEquals(90000L, s.transfer());
        assertEquals(183000L, s.total());
        assertEquals(1, s.refundCount());
        assertEquals(27000L, s.refunded());
    }

    @Test
    void eachOrderCarriesItsRefundedAndPendingAmounts() {
        Order order = new Order();
        ReflectionTestUtils.setField(order, "id", 7L);
        when(repository.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any()))
                .thenReturn(List.of(order));
        when(repository.sumRefundsByOrder(any())).thenReturn(List.of(
                new Object[]{7L, Payment.REFUNDED, 27000L},
                new Object[]{7L, Payment.REFUND_PENDING, 30000L}));

        OrderHistoryView.Row row = service.history(null).orders().get(0);

        assertEquals(27000L, row.refundedAmount());
        assertEquals(30000L, row.refundPendingAmount());
    }
}
