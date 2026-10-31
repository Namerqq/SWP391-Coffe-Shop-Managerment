package com.example.project.service;

import com.example.project.dto.revenue.RevenueReportView;
import com.example.project.entity.Payment;
import com.example.project.exception.ApiException;
import com.example.project.repository.RevenueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * UC-RP01 View Order Statistics: doanh thu theo ngày / tuần / tháng / năm của Quản lý.
 * Chạy riêng: mvn test -Dtest=RevenueServiceTest
 */
class RevenueServiceTest {

    private RevenueRepository repository;
    private RevenueService service;

    @BeforeEach
    void setUp() {
        repository = mock(RevenueRepository.class);
        service = new RevenueService(repository);
    }

    @Test
    void weekStartsOnMondayAndHasSevenRows() {
        // 24/10/2026 là Thứ 7 -> tuần 19/10 (T2) .. 25/10 (CN)
        RevenueReportView v = service.report("WEEK", LocalDate.of(2026, 10, 24));

        assertEquals(LocalDate.of(2026, 10, 19), v.from());
        assertEquals(LocalDate.of(2026, 10, 25), v.to());
        assertEquals(7, v.rows().size());
        assertEquals("T2 19/10", v.rows().get(0).label());
        assertEquals("CN 25/10", v.rows().get(6).label());
        verify(repository).findPaid(LocalDateTime.of(2026, 10, 19, 0, 0), LocalDateTime.of(2026, 10, 26, 0, 0));
        verify(repository).findPaid(LocalDateTime.of(2026, 10, 12, 0, 0), LocalDateTime.of(2026, 10, 19, 0, 0));
    }

    @Test
    void monthHasOneRowPerDayAndYearOnePerMonth() {
        assertEquals(28, service.report("MONTH", LocalDate.of(2026, 2, 10)).rows().size());
        assertEquals(12, service.report("YEAR", LocalDate.of(2026, 2, 10)).rows().size());
    }

    @Test
    void billsAreGroupedIntoRowsAndSplitByMethod() {
        when(repository.findPaid(eq(LocalDateTime.of(2026, 10, 1, 0, 0)), any())).thenReturn(List.of(
                new Object[]{LocalDateTime.of(2026, 10, 1, 8, 15), Payment.CASH, 50000L},
                new Object[]{LocalDateTime.of(2026, 10, 1, 8, 40), Payment.BANK_TRANSFER, 70000L},
                new Object[]{LocalDateTime.of(2026, 10, 3, 19, 5), Payment.CASH, 30000L}));

        RevenueReportView v = service.report("MONTH", LocalDate.of(2026, 10, 15));

        RevenueReportView.Row first = v.rows().get(0);
        assertEquals("01/10", first.label());
        assertEquals(2, first.billCount());
        assertEquals(50000L, first.cash());
        assertEquals(70000L, first.transfer());
        assertEquals(30000L, v.rows().get(2).total());
        assertEquals(3, v.summary().billCount());
        assertEquals(150000L, v.summary().total());
        assertEquals(50000L, v.summary().averagePerBill());
    }

    @Test
    void dayViewDropsEmptyHoursAtBothEnds() {
        when(repository.findPaid(eq(LocalDateTime.of(2026, 10, 1, 0, 0)), any())).thenReturn(List.of(
                new Object[]{LocalDateTime.of(2026, 10, 1, 7, 30), Payment.CASH, 40000L},
                new Object[]{LocalDateTime.of(2026, 10, 1, 10, 0), Payment.CASH, 20000L}));

        List<RevenueReportView.Row> rows = service.report("DAY", LocalDate.of(2026, 10, 1)).rows();

        assertEquals(4, rows.size()); // 07:00, 08:00, 09:00, 10:00 — giờ trống ở giữa vẫn giữ
        assertEquals("07:00", rows.get(0).label());
        assertEquals("10:00", rows.get(3).label());
    }

    @Test
    void previousPeriodTotalIsReturned() {
        when(repository.findPaid(eq(LocalDateTime.of(2026, 9, 30, 0, 0)), any())).thenReturn(List.<Object[]>of(
                new Object[]{LocalDateTime.of(2026, 9, 30, 9, 0), Payment.CASH, 80000L}));

        assertEquals(80000L, service.report("DAY", LocalDate.of(2026, 10, 1)).summary().previousTotal());
    }

    @Test
    void refundsAreSubtractedByRefundTimeAndMethod() {
        when(repository.findPaid(eq(LocalDateTime.of(2026, 10, 1, 0, 0)), any())).thenReturn(List.of(
                new Object[]{LocalDateTime.of(2026, 10, 1, 8, 15), Payment.CASH, 50000L},
                new Object[]{LocalDateTime.of(2026, 10, 1, 8, 40), Payment.BANK_TRANSFER, 70000L}));
        when(repository.findRefunded(eq(LocalDateTime.of(2026, 10, 1, 0, 0)), any())).thenReturn(List.<Object[]>of(
                new Object[]{LocalDateTime.of(2026, 10, 3, 9, 0), Payment.BANK_TRANSFER, 20000L}));

        RevenueReportView v = service.report("MONTH", LocalDate.of(2026, 10, 15));

        assertEquals(70000L, v.rows().get(0).transfer()); // ngày thu tiền giữ nguyên
        assertEquals(-20000L, v.rows().get(2).transfer()); // trừ vào ngày trả lại khách
        assertEquals(0, v.rows().get(2).billCount());     // hoàn tiền không tính là hóa đơn
        assertEquals(2, v.summary().billCount());
        assertEquals(100000L, v.summary().total());
        assertEquals(20000L, v.summary().refunded());
    }

    @Test
    void customDateRangeReturnsCorrectRowsAndDates() {
        LocalDate from = LocalDate.of(2026, 10, 20);
        LocalDate to = LocalDate.of(2026, 10, 25); // 6 ngày

        when(repository.findPaid(eq(from.atStartOfDay()), eq(to.plusDays(1).atStartOfDay())))
                .thenReturn(List.of(
                        new Object[]{LocalDateTime.of(2026, 10, 21, 14, 0), Payment.CASH, 45000L},
                        new Object[]{LocalDateTime.of(2026, 10, 24, 16, 30), Payment.BANK_TRANSFER, 55000L}
                ));

        RevenueReportView v = service.report("CUSTOM", null, from, to);

        assertEquals("CUSTOM", v.period());
        assertEquals(from, v.from());
        assertEquals(to, v.to());
        assertEquals(6, v.rows().size());
        assertEquals("20/10", v.rows().get(0).label());
        assertEquals("25/10", v.rows().get(5).label());
        assertEquals(2, v.summary().billCount());
        assertEquals(100000L, v.summary().total());
        assertEquals(45000L, v.summary().cash());
        assertEquals(55000L, v.summary().transfer());
    }

    @Test
    void customDateRangeRejectsInvalidDates() {
        // from > to
        assertThrows(ApiException.class, () ->
                service.report("CUSTOM", null, LocalDate.of(2026, 10, 25), LocalDate.of(2026, 10, 20)));

        // to in future
        assertThrows(ApiException.class, () ->
                service.report("CUSTOM", null, LocalDate.now().minusDays(2), LocalDate.now().plusDays(1)));
    }

    @Test
    void futureDateAndUnknownPeriodAreRejected() {
        assertThrows(ApiException.class, () -> service.report("DAY", LocalDate.now().plusDays(1)));
        assertThrows(ApiException.class, () -> service.report("QUARTER", null));
        verifyNoInteractions(repository);
    }
}
