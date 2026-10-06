package com.example.project.service;

import com.example.project.dto.barista.RecipeView;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * UC-B01 Process Orders, UC-B02 View Orders details, UC-B03 Update Order status.
 * Theo BF-02: thiếu nguyên liệu thì Pha chế hủy đơn còn chờ pha (bắt buộc ghi lý do).
 */
@Service
public class BaristaService {

    private static final List<String> BOARD_STATUSES =
            List.of(Order.PENDING, Order.CONFIRMED, Order.PREPARING, Order.READY);

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderSupportService support;

    public BaristaService(OrderRepository orderRepository, MenuItemRepository menuItemRepository,
                          OrderSupportService support) {
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
        this.support = support;
    }

    /** Đơn trên bảng pha chế (Chờ pha / Đang pha / Chờ mang ra), đơn đến trước nằm trên. */
    @Transactional(readOnly = true)
    public List<OrderView> board() {
        return orderRepository.findByStatusInOrderByCreatedAtAsc(BOARD_STATUSES).stream()
                .filter(BaristaService::visibleToBarista)
                .map(support::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderView detail(Long id) {
        return support.toView(find(id));
    }

    /** Chờ pha -> Đang pha. */
    @Transactional
    public OrderView start(Long id) {
        Order o = find(id);
        if (!visibleToBarista(o) || !o.isWaitingForPreparation()) {
            throw ApiException.badRequest("Đơn " + num(o) + " không còn ở trạng thái Chờ pha.");
        }
        o.moveTo(Order.PREPARING, OrderItem.PREPARING);
        return support.toView(orderRepository.save(o));
    }

    /** Đang pha -> Chờ mang ra. */
    @Transactional
    public OrderView ready(Long id) {
        Order o = find(id);
        if (!Order.PREPARING.equals(o.getStatus())) {
            throw ApiException.badRequest("Đơn " + num(o) + " chưa bắt đầu pha hoặc đã pha xong.");
        }
        o.moveTo(Order.READY, OrderItem.READY);
        return support.toView(orderRepository.save(o));
    }

    /** Tích / bỏ tích 1 món đã pha xong. Mọi món (chưa hủy) đều đã tích -> đơn tự chuyển Đang pha -> Chờ mang ra. */
    @Transactional
    public OrderView checkItem(Long orderId, Long itemId, boolean done) {
        Order o = find(orderId);
        if (!Order.PREPARING.equals(o.getStatus())) {
            throw ApiException.badRequest("Đơn " + num(o) + " chưa bắt đầu pha hoặc đã pha xong.");
        }
        OrderItem line = o.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Món không thuộc đơn này."));
        if (OrderItem.CANCELLED.equals(line.getItemStatus())) {
            throw ApiException.badRequest("Món này đã bị hủy.");
        }
        line.setItemStatus(done ? OrderItem.READY : OrderItem.PREPARING);

        boolean allDone = o.getItems().stream()
                .filter(i -> !OrderItem.CANCELLED.equals(i.getItemStatus()))
                .allMatch(i -> OrderItem.READY.equals(i.getItemStatus()));
        if (allDone) o.moveTo(Order.READY, OrderItem.READY);
        return support.toView(orderRepository.save(o));
    }

    /** Hết nguyên liệu: hủy đơn còn chờ pha. */
    @Transactional
    public OrderView cancelOutOfStock(Long id, String reason) {
        String r = OrderSupportService.blankToNull(reason);
        if (r == null) throw ApiException.badRequest("Vui lòng ghi rõ nguyên liệu bị thiếu.");
        Order o = find(id);
        support.cancelPendingOrder(o, "Hết nguyên liệu: " + r);
        return support.toView(o);
    }

    @Transactional(readOnly = true)
    public RecipeView recipe(Long menuItemId) {
        MenuItem m = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món id = " + menuItemId));
        return new RecipeView(m.getId(), m.getName(), m.getRecipeIngredients(), m.getRecipeInstructions());
    }

    /** Đơn online còn chờ thu ngân xác nhận thì chưa hiện cho pha chế (dùng ở Iter2). */
    private static boolean visibleToBarista(Order o) {
        return !(Order.SOURCE_ONLINE.equals(o.getSource()) && Order.PENDING.equals(o.getStatus()));
    }

    private Order find(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + id));
    }

    private static String num(Order o) {
        return OrderSupportService.displayNumber(o.getOrderNumber());
    }
}
