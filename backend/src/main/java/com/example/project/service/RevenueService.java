package com.example.project.service;

import com.example.project.dto.revenue.RevenueReportView;
import com.example.project.entity.Payment;
import com.example.project.exception.ApiException;
import com.example.project.repository.RevenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * UC-RP01 View Order Statistics: Quản lý xem doanh thu theo ngày / tuần / tháng / năm.
 * Doanh thu tính theo hóa đơn đã thu (payments PAID) và giờ thu tiền, giống phần "Đã thu" ở Lịch sử đơn của Thu ngân.
 * Từ Iter3 (Hoàn tiền, ThangNN) trừ tiền đã hoàn trả khách (payments REFUNDED) theo giờ trả.
 * Tuần bắt đầu từ Thứ 2. Chỉ xem, không sửa gì.
 */
@Service
public class RevenueService {

    public static final String DAY = "DAY";
    public static final String WEEK = "WEEK";
    public static final String MONTH = "MONTH";
    public static final String YEAR = "YEAR";

    private static final int TOP_ITEMS = 10;
    private static final String[] WEEKDAYS = {"T2", "T3", "T4", "T5", "T6", "T7", "CN"};

    private final RevenueRepository revenueRepository;

    public RevenueService(RevenueRepository revenueRepository) {
        this.revenueRepository = revenueRepository;
    }

    /** period bỏ trống = DAY; date = 1 ngày bất kỳ trong kỳ muốn xem, bỏ trống = hôm nay. */
    @Transactional(readOnly = true)
    public RevenueReportView report(String period, LocalDate date) {
        String p = period == null || period.isBlank() ? DAY : period.trim().toUpperCase();
        LocalDate today = LocalDate.now();
        LocalDate day = date == null ? today : date;
        if (day.isAfter(today)) {
            throw ApiException.badRequest("Không xem được ngày trong tương lai.");
        }

        LocalDate from = startOf(p, day);
        LocalDate to = next(p, from);
        LocalDate previousFrom = previous(p, from);

        List<Object[]> paid = revenueRepository.findPaid(from.atStartOfDay(), to.atStartOfDay());
        List<Object[]> refundedRows = revenueRepository.findRefunded(from.atStartOfDay(), to.atStartOfDay());
        List<RevenueReportView.Row> rows = rows(p, from, to, paid, refundedRows);
        long refunded = sumAmount(refundedRows);

        int bills = 0;
        long cash = 0;
        long transfer = 0;
        for (RevenueReportView.Row r : rows) {
            bills += r.billCount();
            cash += r.cash();
            transfer += r.transfer();
        }
        long total = cash + transfer;
        long previousTotal = sumAmount(revenueRepository.findPaid(previousFrom.atStartOfDay(), from.atStartOfDay()))
                - sumAmount(revenueRepository.findRefunded(previousFrom.atStartOfDay(), from.atStartOfDay()));
        RevenueReportView.Summary summary = new RevenueReportView.Summary(bills, total, cash, transfer,
                bills == 0 ? 0 : total / bills, previousTotal, refunded);

        List<RevenueReportView.TopItem> topItems = revenueRepository
                .sumSoldItems(from.atStartOfDay(), to.atStartOfDay()).stream()
                .limit(TOP_ITEMS)
                .map(r -> new RevenueReportView.TopItem((String) r[0], ((Number) r[1]).longValue(),
                        ((Number) r[2]).longValue()))
                .toList();

        if (DAY.equals(p)) rows = trimEmptyHours(rows);
        return new RevenueReportView(p, from, to.minusDays(1), summary, rows, topItems);
    }

    private static LocalDate startOf(String period, LocalDate day) {
        return switch (period) {
            case DAY -> day;
            case WEEK -> day.with(DayOfWeek.MONDAY);
            case MONTH -> day.withDayOfMonth(1);
            case YEAR -> day.withDayOfYear(1);
            default -> throw ApiException.badRequest("Kỳ xem không hợp lệ: " + period);
        };
    }

    private static LocalDate next(String period, LocalDate from) {
        return switch (period) {
            case DAY -> from.plusDays(1);
            case WEEK -> from.plusWeeks(1);
            case MONTH -> from.plusMonths(1);
            default -> from.plusYears(1);
        };
    }

    private static LocalDate previous(String period, LocalDate from) {
        return switch (period) {
            case DAY -> from.minusDays(1);
            case WEEK -> from.minusWeeks(1);
            case MONTH -> from.minusMonths(1);
            default -> from.minusYears(1);
        };
    }

    private static long sumAmount(List<Object[]> rows) {
        return rows.stream().mapToLong(r -> ((Number) r[2]).longValue()).sum();
    }

    /**
     * Chia kỳ thành các dòng rỗng (giờ / ngày / tháng) rồi cộng từng hóa đơn vào đúng dòng.
     * Tiền đã hoàn trả khách (refunded) trừ vào dòng theo giờ trả, đúng cách hoàn (không tính là 1 hóa đơn).
     */
    private static List<RevenueReportView.Row> rows(String period, LocalDate from, LocalDate to, List<Object[]> paid,
                                                    List<Object[]> refunded) {
        List<String> labels = new ArrayList<>();
        switch (period) {
            case DAY -> {
                for (int h = 0; h < 24; h++) labels.add(String.format("%02d:00", h));
            }
            case YEAR -> {
                for (int m = 1; m <= 12; m++) labels.add("Tháng " + m);
            }
            default -> {
                for (LocalDate d = from; d.isBefore(to); d = d.plusDays(1)) {
                    String dm = String.format("%02d/%02d", d.getDayOfMonth(), d.getMonthValue());
                    labels.add(WEEK.equals(period) ? WEEKDAYS[d.getDayOfWeek().getValue() - 1] + " " + dm : dm);
                }
            }
        }

        int n = labels.size();
        int[] bills = new int[n];
        long[] cash = new long[n];
        long[] transfer = new long[n];
        for (Object[] r : paid) {
            long amount = ((Number) r[2]).longValue();
            int i = index(period, from, (LocalDateTime) r[0]);
            bills[i]++;
            if (Payment.CASH.equals(r[1])) cash[i] += amount;
            else transfer[i] += amount;
        }
        for (Object[] r : refunded) {
            long amount = ((Number) r[2]).longValue();
            int i = index(period, from, (LocalDateTime) r[0]);
            if (Payment.CASH.equals(r[1])) cash[i] -= amount;
            else transfer[i] -= amount;
        }

        List<RevenueReportView.Row> rows = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            rows.add(new RevenueReportView.Row(labels.get(i), bills[i], cash[i], transfer[i], cash[i] + transfer[i]));
        }
        return rows;
    }

    /** Dòng của 1 thời điểm thu / hoàn tiền: DAY theo giờ, YEAR theo tháng, còn lại theo ngày. */
    private static int index(String period, LocalDate from, LocalDateTime at) {
        return switch (period) {
            case DAY -> at.getHour();
            case YEAR -> at.getMonthValue() - 1;
            default -> (int) ChronoUnit.DAYS.between(from, at.toLocalDate());
        };
    }

    /** Xem theo ngày: bỏ các giờ trống ở đầu và cuối (trước giờ mở cửa / sau giờ đóng cửa). Giờ chỉ có hoàn tiền vẫn giữ. */
    private static List<RevenueReportView.Row> trimEmptyHours(List<RevenueReportView.Row> rows) {
        int first = 0;
        int last = rows.size() - 1;
        while (first <= last && isEmpty(rows.get(first))) first++;
        while (last >= first && isEmpty(rows.get(last))) last--;
        return rows.subList(first, last + 1);
    }

    private static boolean isEmpty(RevenueReportView.Row row) {
        return row.billCount() == 0 && row.cash() == 0 && row.transfer() == 0;
    }
}
