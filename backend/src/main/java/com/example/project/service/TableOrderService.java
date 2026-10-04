package com.example.project.service;

import com.example.project.dto.order.OrderItemRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.CafeTable;
import com.example.project.entity.Order;
import com.example.project.entity.TableSession;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CafeTableRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;

/**
 * Tạo đơn tại bàn (DINE_IN), dùng chung cho khách quét QR và phục vụ gọi món giúp (UC-W01).
 * Đơn mới: trạng thái Chờ pha (PENDING_CONFIRMATION), mọi món PENDING, gắn vào lượt khách đang mở của bàn.
 */
@Service
public class TableOrderService {

    private final CafeTableRepository tableRepository;
    private final OrderRepository orderRepository;
    private final OrderSupportService support;

    public TableOrderService(CafeTableRepository tableRepository, OrderRepository orderRepository,
                             OrderSupportService support) {
        this.tableRepository = tableRepository;
        this.orderRepository = orderRepository;
        this.support = support;
    }

    /** staff = null: khách tự gọi qua QR; khác null: phục vụ gọi giúp. Trả về id đơn mới. */
    @Transactional
    public Long createDineIn(Long tableId, List<OrderItemRequest> items, String note, User staff) {
        if (items == null || items.isEmpty()) throw ApiException.badRequest("Chưa chọn món nào.");
        CafeTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn."));
        TableSession session = support.currentOrOpenSession(table);
        if (TableSession.PAYMENT_PENDING.equals(session.getStatus())) {
            throw ApiException.badRequest(table.getTableNumber() + " đang thanh toán, chưa thể gọi thêm món.");
        }

        Order o = new Order();
        o.setOrderNumber(support.nextOrderNumber());
        o.setSource(staff == null ? Order.SOURCE_QR : Order.SOURCE_STAFF);
        o.setFulfillmentType(Order.DINE_IN);
        o.setStatus(Order.PENDING);
        o.setCreatedBy(staff);
        o.setTableSession(session);
        o.setCustomerNote(OrderSupportService.blankToNull(note));
        items.forEach(i -> o.addItem(support.buildItem(i)));
        o.recalcTotal();
        return orderRepository.save(o).getId();
    }

    @Transactional(readOnly = true)
    public OrderView view(Long orderId) {
        return support.toView(orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng.")));
    }

    /** Các đơn theo id, mới nhất trước. */
    @Transactional(readOnly = true)
    public List<OrderView> views(Collection<Long> orderIds) {
        if (orderIds.isEmpty()) return List.of();
        return orderRepository.findAllById(orderIds).stream()
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .map(support::toView)
                .toList();
    }
}
