package com.example.project.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    /**
     * Dữ liệu sơ đồ bàn cho màn Thanh toán (Cashier) và Phục vụ (Waiter): mỗi bàn đang hoạt động là 1 TableBoardItem.
     * Bàn trống: sessionId = null, mọi số đếm = 0.
     * Bàn có khách: đếm đơn theo trạng thái phục vụ VÀ theo thanh toán, 2 trạng thái song song (không gộp).
     * Chỉ dùng 3 câu truy vấn cho mọi bàn (tránh N+1) vì frontend hỏi lại mỗi 5 giây.
     */
    @Transactional(readOnly = true)
    public List<TableBoardItem> board() {
        // 1. Lượt khách đang mở của từng bàn (id bàn -> lượt). Lỡ 1 bàn có 2 lượt mở thì giữ lượt mở sớm nhất.
        Map<Long, TableSession> sessionByTable = new HashMap<>();
        for (TableSession s : sessionRepository.findByStatusInOrderByOpenedAtAsc(ACTIVE)) {
            sessionByTable.putIfAbsent(s.getTable().getId(), s);
        }

        // 2. Mọi đơn của các lượt đó trong 1 câu truy vấn (IN), rồi nhóm theo lượt khách.
        Map<Long, List<Order>> ordersBySession = new HashMap<>();
        if (!sessionByTable.isEmpty()) {   // IN () rỗng là SQL lỗi
            List<Long> ids = sessionByTable.values().stream().map(TableSession::getId).toList();
            for (Order o : orderRepository.findByTableSession_IdInOrderByCreatedAtAsc(ids)) {
                ordersBySession.computeIfAbsent(o.getTableSession().getId(), k -> new ArrayList<>()).add(o);
            }
        }

        // 3. Mỗi bàn đang dùng (kể cả bàn trống) -> 1 ô trên sơ đồ, theo số bàn.
        List<TableBoardItem> result = new ArrayList<>();
        for (CafeTable t : tableRepository.findByActiveTrueOrderByTableNumberAsc()) {
            TableSession s = sessionByTable.get(t.getId());
            if (s == null) { // bàn trống
                result.add(new TableBoardItem(t.getId(), t.getTableNumber(), null, null, null, 0, 0, 0, 0, 0, 0, 0, 0, 0));
                continue;
            }
            int waiting = 0, preparing = 0, ready = 0, served = 0, unpaid = 0;
            long total = 0, unpaidTotal = 0;
            for (Order o : ordersBySession.getOrDefault(s.getId(), List.of())) {
                if (isCancelled(o)) continue; // đơn đã hủy không tính tiền, không tính số đơn
                total += o.activeTotal();     // activeTotal: đã trừ món bị bỏ / đã hoàn

                // Thanh toán: đếm riêng, không phụ thuộc trạng thái phục vụ (trả trước khi món ra vẫn được).
                if (!o.isPaid()) {
                    unpaid++;
                    unpaidTotal += o.activeTotal();
                }
                // Phục vụ: mỗi đơn rơi vào đúng 1 nhóm.
                if (o.isWaitingForPreparation()) waiting++;
                else if (Order.PREPARING.equals(o.getStatus())) preparing++;
                else if (Order.READY.equals(o.getStatus())) ready++;
                else if (Order.SERVED.equals(o.getStatus())) served++;
            }
            // unfinished = chờ pha + đang pha + chờ mang ra. Bàn trả về trống khi unfinished = 0 và unpaid = 0 (GB-04).
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
