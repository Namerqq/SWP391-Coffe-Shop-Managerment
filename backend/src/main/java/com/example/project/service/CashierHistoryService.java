package com.example.project.service;

import com.example.project.dto.cashier.OrderHistoryView;
import com.example.project.entity.Order;
import com.example.project.entity.Payment;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.CashierHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * UC-C15 View Bills History (ThangNN Iter3): thu ngân xem lại mọi đơn trong 1 ngày (mặc định hôm nay,
 * chọn được ngày bất kỳ trước đó) và mở lại hóa đơn của đơn đã thanh toán. Màn này chỉ đọc; hoàn tiền làm ở RefundService.
 * Thu ngân xem được hóa đơn của mọi thu ngân.
 * Iter3 Hoàn tiền: mỗi đơn kèm tiền đã hoàn / chờ hoàn; tiền trong ngày trừ tiền đã hoàn trả khách.
 */
@Service
public class CashierHistoryService {

    private final CashierHistoryRepository historyRepository;
    private final OrderSupportService support;

    public CashierHistoryService(CashierHistoryRepository historyRepository, OrderSupportService support) {
        this.historyRepository = historyRepository;
        this.support = support;
    }

    @Transactional(readOnly = true)
    public OrderHistoryView history(LocalDate date) {
        LocalDate today = LocalDate.now();
        LocalDate day = date == null ? today : date;
        if (day.isAfter(today)) {
            throw ApiException.badRequest("Không xem được ngày trong tương lai.");
        }
        LocalDateTime from = day.atStartOfDay();
        LocalDateTime to = day.plusDays(1).atStartOfDay();

        List<Order> orders = historyRepository.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(from, to);
        Map<Long, long[]> refunds = refundsByOrder(orders);
        List<OrderHistoryView.Row> rows = orders.stream()
                .map(o -> toRow(o, refunds.getOrDefault(o.getId(), NO_REFUND)))
                .toList();
        return new OrderHistoryView(day, rows, summary(from, to));
    }

    private static final long[] NO_REFUND = {0, 0};

    /** Hoàn tiền (Iter3): orderId -> [đã hoàn, chờ chuyển khoản trả khách]. */
    private Map<Long, long[]> refundsByOrder(List<Order> orders) {
        Map<Long, long[]> out = new HashMap<>();
        List<Long> ids = orders.stream().map(Order::getId).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) return out;
        for (Object[] r : historyRepository.sumRefundsByOrder(ids)) {
            long[] v = out.computeIfAbsent((Long) r[0], k -> new long[2]);
            long amount = ((Number) r[2]).longValue();
            if (Payment.REFUNDED.equals(r[1])) v[0] += amount;
            else v[1] += amount;
        }
        return out;
    }

    private OrderHistoryView.Row toRow(Order o, long[] refund) {
        Payment p = o.getPayment();
        User cashier = p == null ? null : p.getConfirmedBy();
        return new OrderHistoryView.Row(support.toView(o),
                p == null ? null : p.getPaymentCode(),
                p == null ? null : p.getPaymentMethod(),
                cashier == null ? null : cashier.getFullName(),
                refund[0], refund[1]);
    }

    /**
     * Tiền thực giữ lại trong ngày: tiền đã thu theo hóa đơn (đúng số khách trả, đã trừ giảm giá bằng điểm)
     * trừ tiền đã hoàn trả khách trong ngày (theo giờ trả, cùng cách hoàn: tiền mặt trừ vào tiền mặt).
     */
    private OrderHistoryView.Summary summary(LocalDateTime from, LocalDateTime to) {
        int bills = 0;
        long cash = 0;
        long transfer = 0;
        for (Object[] r : historyRepository.sumPaidByMethod(from, to)) {
            String method = (String) r[0];
            long amount = ((Number) r[2]).longValue();
            bills += ((Number) r[1]).intValue();
            if (Payment.CASH.equals(method)) cash += amount;
            else transfer += amount;
        }
        int refundCount = 0;
        long refunded = 0;
        for (Object[] r : historyRepository.sumRefundedByMethod(from, to)) {
            long amount = ((Number) r[2]).longValue();
            refundCount += ((Number) r[1]).intValue();
            refunded += amount;
            if (Payment.CASH.equals(r[0])) cash -= amount;
            else transfer -= amount;
        }
        return new OrderHistoryView.Summary(bills, cash + transfer, cash, transfer, refundCount, refunded);
    }
}
