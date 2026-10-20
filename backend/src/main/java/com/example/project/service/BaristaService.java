package com.example.project.service;

import com.example.project.dto.barista.RecipeView;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.OrderItemRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * UC-B01 Process Orders, UC-B02 View Orders details, UC-B03 Update Order status.
 * Pha chế theo TỪNG MÓN: tích món pha xong -> món sang Chờ mang ra ngay,
 * đơn tự đổi trạng thái theo các món (Order.syncStatusFromItems).
 * Tích món đầu tiên của đơn -> tự động trừ nguyên liệu tồn kho theo định lượng công thức.
 * Theo BF-02: thiếu nguyên liệu thì Pha chế hủy món còn chờ pha; hủy hết món thì đơn tự hủy.
 */
@Service
public class BaristaService {

    private static final List<String> BOARD_STATUSES =
            List.of(Order.PENDING, Order.CONFIRMED, Order.PREPARING, Order.READY);
    private static final String OUT_OF_STOCK = "Hết nguyên liệu";

    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final OrderItemRepository itemRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderSupportService support;
    private final InventoryService inventoryService;

    public BaristaService(OrderRepository orderRepository, OrderLockRepository lockRepository,
                          OrderItemRepository itemRepository, MenuItemRepository menuItemRepository,
                          OrderSupportService support, InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.itemRepository = itemRepository;
        this.menuItemRepository = menuItemRepository;
        this.support = support;
        this.inventoryService = inventoryService;
    }

    /** Đơn còn món chờ pha hoặc chờ mang ra, đơn đến trước nằm trên. Frontend chia món vào 2 cột. */
    @Transactional(readOnly = true)
    public List<OrderView> board() {
        return orderRepository.findByStatusInOrderByCreatedAtAsc(BOARD_STATUSES).stream()//tra ve list cac order chi barista thay duoc
                .filter(BaristaService::visibleToBarista)
                .map(support::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderView detail(Long id) {
        return support.toView(find(id));
    }

    /**
     * Tích (done = true): món chờ pha -> Chờ mang ra. Bỏ tích (done = false): món chờ mang ra -> Chờ pha
     * (chỉ khi phục vụ chưa mang ra). Tự động trừ kho nếu đơn chưa từng trừ.
     */
    @Transactional
    public OrderView checkItem(Long orderId, Long itemId, boolean done, User barista) {
        Order o = findForUpdate(orderId);
        OrderItem line = findLine(o, itemId);
        if (done) {
            if (!line.isWaitingForPreparation()) throw ApiException.badRequest("Món này không còn ở trạng thái Chờ pha.");
            if (o.getAcceptedAt() == null) {
                o.setAcceptedBy(barista);
                o.setAcceptedAt(LocalDateTime.now());
                inventoryService.deductForOrder(o, barista);
            }
            line.setItemStatus(OrderItem.READY);
        } else {
            if (!OrderItem.READY.equals(line.getItemStatus())) {
                throw ApiException.badRequest("Món này đã được mang ra hoặc chưa pha xong, không bỏ tích được.");
            }
            line.setItemStatus(OrderItem.PENDING);
        }
        o.syncStatusFromItems();
        return support.toView(orderRepository.save(o));
    }

    /**
     * Tích xong cùng lúc nhiều món (ô tích ở "Tổng cần pha", vd mọi ly Matcha đang chờ).
     * Món nào trong lúc đó đã bị hủy / đã được tích thì bỏ qua. Trả về bảng pha chế mới.
     */
    @Transactional
    public List<OrderView> checkItems(List<Long> itemIds, User barista) {
        Set<Long> wanted = new HashSet<>(itemIds);
        List<Long> orderIds = itemRepository.findAllById(wanted).stream()
                .map(i -> i.getOrder().getId())
                .distinct()
                .sorted()                       // khóa đơn theo thứ tự id để 2 người tích cùng lúc không chờ nhau mãi
                .toList();
        if (orderIds.isEmpty()) throw new ResourceNotFoundException("Không tìm thấy món cần tích.");
        for (Long id : orderIds) {
            Order o = findForUpdate(id);
            if (o.getAcceptedAt() == null) {
                o.setAcceptedBy(barista);
                o.setAcceptedAt(LocalDateTime.now());
                inventoryService.deductForOrder(o, barista);
            }
            o.getItems().stream()
                    .filter(i -> wanted.contains(i.getId()) && i.isWaitingForPreparation())
                    .forEach(i -> i.setItemStatus(OrderItem.READY));
            o.syncStatusFromItems();
            orderRepository.save(o);
        }
        return board();
    }

    /**
     * BF-02: thiếu nguyên liệu -> hủy 1 món còn chờ pha. Tiền món bị hủy không tính (activeTotal).
     * Hủy hết món thì đơn tự hủy; bàn không còn đơn nào thì trả bàn về trống.
     * Đơn đã thu tiền thì không hủy ở đây (cần hoàn tiền) -> báo thu ngân.
     */
    @Transactional
    public OrderView cancelItem(Long orderId, Long itemId) {
        Order o = findForUpdate(orderId);
        OrderItem line = findLine(o, itemId);
        if (!line.isWaitingForPreparation()) {
            throw ApiException.badRequest("Chỉ hủy được món còn chờ pha (món đã pha xong không hủy được).");
        }
        if (o.isPaid()) {
            throw ApiException.badRequest("Đơn " + num(o) + " đã thanh toán, hủy món cần hoàn tiền. Vui lòng báo thu ngân.");
        }
        line.setItemStatus(OrderItem.CANCELLED);
        o.recalcTotal();//tinh lai tien trong order sau khi huy mon
        o.syncStatusFromItems();//dong bo tu dong hoa trang thai don hang(nen de auto)
        if (o.isCancelled()) o.setCancelReason(OUT_OF_STOCK);
        orderRepository.saveAndFlush(o);
        support.closeSessionIfEmpty(o.getTableSession());
        support.closeSessionIfSettled(o.getTableSession());
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

    /** Đơn pha chế được thao tác: đọc kèm khóa dòng, phải đang hiện trên bảng pha chế. */
    private Order findForUpdate(Long id) {
        Order o = lockRepository.findWithLockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + id));
        if (!BOARD_STATUSES.contains(o.getStatus()) || !visibleToBarista(o)) {
            throw ApiException.badRequest("Đơn " + num(o) + " không còn trên bảng pha chế.");
        }
        return o;
    }

    private static OrderItem findLine(Order o, Long itemId) {
        return o.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Món không thuộc đơn này."));
    }

    private static String num(Order o) {
        return OrderSupportService.displayNumber(o.getOrderNumber());
    }
}
