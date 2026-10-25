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
import java.util.List;

/**
 * UC-C15 View Bills History (ThangNN Iter3): thu ngân xem lại mọi đơn trong 1 ngày (mặc định hôm nay,
 * chọn được ngày bất kỳ trước đó) và mở lại hóa đơn của đơn đã thanh toán. Chỉ xem, không sửa / hủy gì.
 * Thu ngân xem được hóa đơn của mọi thu ngân.
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

        List<OrderHistoryView.Row> rows = historyRepository
                .findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(from, to)
                .stream().map(this::toRow).toList();
        return new OrderHistoryView(day, rows, summary(from, to));
    }

    private OrderHistoryView.Row toRow(Order o) {
        Payment p = o.getPayment();
        User cashier = p == null ? null : p.getConfirmedBy();
        return new OrderHistoryView.Row(support.toView(o),
                p == null ? null : p.getPaymentCode(),
                p == null ? null : p.getPaymentMethod(),
                cashier == null ? null : cashier.getFullName());
    }

    /** Tiền đã thu trong ngày theo hóa đơn (đúng số tiền khách trả, đã trừ giảm giá bằng điểm). */
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
        return new OrderHistoryView.Summary(bills, cash + transfer, cash, transfer);
    }
}
