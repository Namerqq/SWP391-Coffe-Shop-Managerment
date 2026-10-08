package com.example.project.service;

import com.example.project.dto.order.CustomerView;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.order.SessionView;
import com.example.project.dto.order.TableBoardItem;
import com.example.project.entity.CafeTable;
import com.example.project.entity.Order;
import com.example.project.entity.TableSession;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CafeTableRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.TableSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Sơ đồ bàn + chi tiết lượt khách của 1 bàn (DÙNG CHUNG cho Phục vụ và Thu ngân). */
@Service
public class TableBoardService {

    private static final List<String> ACTIVE = List.of(TableSession.OPEN, TableSession.PAYMENT_PENDING);

    private final CafeTableRepository tableRepository;
    private final TableSessionRepository sessionRepository;
    private final OrderRepository orderRepository;
    private final OrderSupportService support;

    public TableBoardService(CafeTableRepository tableRepository, TableSessionRepository sessionRepository,
                             OrderRepository orderRepository, OrderSupportService support) {
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.orderRepository = orderRepository;
        this.support = support;
    }

    @Transactional(readOnly = true)
    public List<TableBoardItem> board() {
        Map<Long, TableSession> sessionByTable = new HashMap<>();
        for (TableSession s : sessionRepository.findByStatusInOrderByOpenedAtAsc(ACTIVE)) {
            sessionByTable.putIfAbsent(s.getTable().getId(), s);
        }
        Map<Long, List<Order>> ordersBySession = new HashMap<>();
        if (!sessionByTable.isEmpty()) {
            List<Long> ids = sessionByTable.values().stream().map(TableSession::getId).toList();
            for (Order o : orderRepository.findByTableSession_IdInOrderByCreatedAtAsc(ids)) {
                ordersBySession.computeIfAbsent(o.getTableSession().getId(), k -> new ArrayList<>()).add(o);
            }
        }

        List<TableBoardItem> result = new ArrayList<>();
        for (CafeTable t : tableRepository.findByActiveTrueOrderByTableNumberAsc()) {
            TableSession s = sessionByTable.get(t.getId());
            if (s == null) {
                result.add(new TableBoardItem(t.getId(), t.getTableNumber(), null, null, null, 0, 0, 0, 0, 0, 0, 0, 0, 0));
                continue;
            }
            int waiting = 0, preparing = 0, ready = 0, served = 0, unpaid = 0;
            long total = 0, unpaidTotal = 0;
            for (Order o : ordersBySession.getOrDefault(s.getId(), List.of())) {
                if (isCancelled(o)) continue;
                total += o.activeTotal();
                if (!o.isPaid()) {
                    unpaid++;
                    unpaidTotal += o.activeTotal();
                }
                if (o.isWaitingForPreparation()) waiting++;
                else if (Order.PREPARING.equals(o.getStatus())) preparing++;
                else if (Order.READY.equals(o.getStatus())) ready++;
                else if (Order.SERVED.equals(o.getStatus())) served++;
            }
            result.add(new TableBoardItem(t.getId(), t.getTableNumber(), s.getId(), s.getSessionCode(), s.getOpenedAt(),
                    waiting + preparing + ready + served, waiting, preparing, ready, served,
                    waiting + preparing + ready, total, unpaid, unpaidTotal));
        }
        return result;
    }

    /** Lượt khách hiện tại của bàn. Bàn trống -> 404. */
    @Transactional(readOnly = true)
    public SessionView currentSession(Long tableId) {
        CafeTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn id = " + tableId));
        TableSession s = sessionRepository.findFirstByTable_IdAndStatusIn(tableId, ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(table.getTableNumber() + " hiện đang trống."));
        return toSessionView(s);
    }

    public SessionView toSessionView(TableSession s) {
        List<Order> orders = orderRepository.findByTableSession_IdOrderByCreatedAtAsc(s.getId());
        List<OrderView> views = orders.stream().map(support::toView).toList();
        List<Order> valid = orders.stream().filter(o -> !isCancelled(o)).toList();
        List<String> unfinished = valid.stream()
                .filter(o -> !o.isServed())
                .map(o -> OrderSupportService.displayNumber(o.getOrderNumber()))
                .toList();
        List<String> unpaid = valid.stream()
                .filter(o -> !o.isPaid())
                .map(o -> OrderSupportService.displayNumber(o.getOrderNumber()))
                .toList();
        long total = valid.stream().mapToLong(Order::activeTotal).sum();
        long paidTotal = valid.stream().filter(Order::isPaid).mapToLong(Order::activeTotal).sum();
        // payable giữ tên cũ cho màn Phục vụ: mọi đơn chưa hủy đều đã phục vụ (không còn là điều kiện thu tiền).
        boolean allServed = !valid.isEmpty() && unfinished.isEmpty();
        return new SessionView(s.getId(), s.getSessionCode(), s.getStatus(), s.getOpenedAt(),
                s.getTable().getId(), s.getTable().getTableNumber(), CustomerView.from(s.getCustomer()),
                total, allServed, unfinished, views, paidTotal, total - paidTotal, unpaid);
    }

    public static boolean isCancelled(Order o) {
        return o.isCancelled();
    }
}
