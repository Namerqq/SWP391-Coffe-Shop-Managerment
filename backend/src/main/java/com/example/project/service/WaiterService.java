package com.example.project.service;

import com.example.project.dto.order.OrderItemRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** UC-W05 Modifying Pending Orders, UC-W06 Change item details, UC-W07 Cancel pending orders. */
@Service
public class WaiterService {

    private final OrderRepository orderRepository;
    private final OrderSupportService support;

    public WaiterService(OrderRepository orderRepository, OrderSupportService support) {
        this.orderRepository = orderRepository;
        this.support = support;
    }

    /** Sửa số lượng / size / đường / đá / topping / ghi chú của 1 món (giá tính lại theo menu hiện tại). */
    @Transactional
    public OrderView updateItem(Long orderId, Long itemId, OrderItemRequest req) {
        Order o = findEditable(orderId);
        OrderItem line = findLine(o, itemId);
        OrderItem fresh = support.buildItem(new OrderItemRequest(line.getMenuItem().getId(), req.quantity(),
                req.sizeId(), req.toppingIds(), req.sugarLevel(), req.iceLevel(), req.note()));
        line.setQuantity(fresh.getQuantity());
        line.setUnitPrice(fresh.getUnitPrice());
        line.setSizeName(fresh.getSizeName());
        line.setSizePrice(fresh.getSizePrice());
        line.setToppingDetails(fresh.getToppingDetails());
        line.setToppingPrice(fresh.getToppingPrice());
        line.setSugarLevel(fresh.getSugarLevel());
        line.setIceLevel(fresh.getIceLevel());
        line.setNote(fresh.getNote());
        line.recalcSubtotal();
        o.recalcTotal();
        return support.toView(orderRepository.saveAndFlush(o));
    }

    /** Bỏ 1 món khỏi đơn (đơn phải còn ít nhất 1 món, muốn bỏ hết thì hủy đơn). */
    @Transactional
    public OrderView removeItem(Long orderId, Long itemId) {
        Order o = findEditable(orderId);
        OrderItem line = findLine(o, itemId);
        long remaining = o.getItems().stream().filter(i -> !OrderItem.CANCELLED.equals(i.getItemStatus())).count();
        if (remaining <= 1) {
            throw ApiException.badRequest("Đơn chỉ còn 1 món. Nếu khách không dùng nữa, hãy hủy cả đơn.");
        }
        o.getItems().remove(line);
        o.recalcTotal();
        return support.toView(orderRepository.saveAndFlush(o));
    }

    /** Hủy đơn còn chờ pha theo yêu cầu khách. */
    @Transactional
    public OrderView cancel(Long orderId, String reason) {
        Order o = findEditable(orderId);
        String r = OrderSupportService.blankToNull(reason);
        support.cancelPendingOrder(o, r == null ? "Khách yêu cầu hủy" : r);
        return support.toView(o);
    }

    private Order findEditable(Long orderId) {
        Order o = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + orderId));
        if (!Order.DINE_IN.equals(o.getFulfillmentType())) {
            throw ApiException.badRequest("Phục vụ chỉ sửa / hủy được đơn tại bàn.");
        }
        if (!o.isWaitingForPreparation()) {
            throw ApiException.badRequest("Đơn " + OrderSupportService.displayNumber(o.getOrderNumber())
                    + " đã bắt đầu pha, không sửa / hủy được nữa.");
        }
        return o;
    }

    private static OrderItem findLine(Order o, Long itemId) {
        return o.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Món không thuộc đơn này."));
    }
}
