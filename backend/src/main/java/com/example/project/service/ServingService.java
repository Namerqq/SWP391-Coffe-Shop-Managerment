package com.example.project.service;

import com.example.project.dto.order.OrderView;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UC-W08 Confirm Orders as Served.
 * Phục vụ: theo dõi đơn tại bàn (món chờ pha / chờ mang ra), mang ra và tích TỪNG MÓN; đủ món thì đơn tự xong.
 * Thu ngân: giao cả đơn mang đi một lần.
 */
@Service
public class ServingService {

    private static final List<String> ACTIVE_STATUSES =
            List.of(Order.PENDING, Order.CONFIRMED, Order.PREPARING, Order.READY);

    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final OrderSupportService support;

    public ServingService(OrderRepository orderRepository, OrderLockRepository lockRepository,
                          OrderSupportService support) {
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.support = support;
    }

    /** Đơn đã pha xong (Chờ mang ra). type = DINE_IN (tại bàn) hoặc PICKUP (mang đi). Chờ lâu nhất ở trên. */
    @Transactional(readOnly = true)
    public List<OrderView> readyOrders(String type) {
        String t = type == null || type.isBlank() ? Order.DINE_IN : type.trim().toUpperCase();
        if (!Order.DINE_IN.equals(t) && !Order.PICKUP.equals(t)) {
            throw ApiException.badRequest("Loại đơn chỉ là DINE_IN hoặc PICKUP.");
        }
        return orderRepository.findByStatusAndFulfillmentTypeOrderByUpdatedAtAsc(Order.READY, t).stream()
                .map(support::toView)
                .toList();
    }

    /** Bảng của phục vụ: đơn tại bàn còn món chờ pha hoặc chờ mang ra, đơn đến trước nằm trên. */
    @Transactional(readOnly = true)
    public List<OrderView> waiterBoard() {
        return orderRepository.findByStatusInOrderByCreatedAtAsc(ACTIVE_STATUSES).stream()
                .filter(o -> Order.DINE_IN.equals(o.getFulfillmentType()))
                .map(support::toView)
                .toList();
    }

    /**
     * Phục vụ mang 1 món ra bàn: món Chờ mang ra -> Đã mang ra. Mọi món đã mang ra thì đơn tự sang Đã phục vụ;
     * mọi đơn của bàn đã phục vụ và đã thanh toán thì bàn tự trả về trống.
     */
    @Transactional
    public OrderView serveItem(Long orderId, Long itemId) {
        Order o = lockRepository.findWithLockById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + orderId));
        if (!Order.DINE_IN.equals(o.getFulfillmentType())) {
            throw ApiException.badRequest("Phục vụ chỉ mang ra món của đơn tại bàn.");
        }
        OrderItem line = o.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Món không thuộc đơn này."));
        if (!OrderItem.READY.equals(line.getItemStatus())) {
            throw ApiException.badRequest("Món " + line.getMenuItem().getName() + " chưa pha xong hoặc đã được mang ra.");
        }
        line.setItemStatus(OrderItem.SERVED);
        o.syncStatusFromItems();
        orderRepository.save(o);
        if (o.isServed()) support.closeSessionIfSettled(o.getTableSession());
        return support.toView(o);
    }

    /**
     * Chờ mang ra -> Đã phục vụ. Đọc đơn kèm khóa dòng để không chồng lên lúc thu ngân đang thu tiền đơn này.
     * Đơn tại bàn: nếu mọi đơn của bàn đã phục vụ và đã thanh toán thì bàn tự trả về trống.
     */
    @Transactional
    public OrderView markServed(Long id) {
        Order o = lockRepository.findWithLockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + id));
        if (!Order.READY.equals(o.getStatus())) {
            throw ApiException.badRequest("Đơn " + OrderSupportService.displayNumber(o.getOrderNumber())
                    + " chưa pha xong hoặc đã được mang ra.");
        }
        o.moveTo(Order.SERVED, OrderItem.SERVED);
        o.setCompletedAt(LocalDateTime.now());
        orderRepository.save(o);
        support.closeSessionIfSettled(o.getTableSession());
        return support.toView(o);
    }
}
