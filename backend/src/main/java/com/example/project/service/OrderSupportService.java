package com.example.project.service;

import com.example.project.dto.order.OrderItemRequest;
import com.example.project.dto.order.OrderItemView;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.order.ToppingView;
import com.example.project.entity.CafeTable;
import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import com.example.project.entity.TableSession;
import com.example.project.exception.ApiException;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.PaymentRepository;
import com.example.project.repository.TableSessionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Quy tắc đơn hàng DÙNG CHUNG cho mọi màn hình (Barista, Waiter, Cashier, đặt món...):
 * tạo dòng món + tính giá, sinh mã đơn / mã thanh toán, hủy đơn chờ pha, chuyển Entity -> DTO.
 * Các hàm ở đây chạy bên trong @Transactional của service gọi tới.
 */
@Service
public class OrderSupportService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyMMdd");

    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final TableSessionRepository sessionRepository;
    private final ObjectMapper objectMapper;

    public OrderSupportService(MenuItemRepository menuItemRepository, OrderRepository orderRepository,
                               PaymentRepository paymentRepository, TableSessionRepository sessionRepository,
                               ObjectMapper objectMapper) {
        this.menuItemRepository = menuItemRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.sessionRepository = sessionRepository;
        this.objectMapper = objectMapper;
    }

    /** Tạo 1 dòng món từ yêu cầu: kiểm tra món còn bán, lấy giá hiện tại làm "ảnh chụp" giá. */
    public OrderItem buildItem(OrderItemRequest req) {
        MenuItem item = menuItemRepository.findById(req.menuItemId())
                .orElseThrow(() -> ApiException.badRequest("Món không tồn tại (id = " + req.menuItemId() + ")."));
        if (item.getCategory().isOptionGroup()) {
            throw ApiException.badRequest("\"" + item.getName() + "\" là lựa chọn Size/Topping, không bán riêng.");
        }
        if (!item.isSellable()) throw ApiException.badRequest("Món \"" + item.getName() + "\" hiện đang ngừng bán.");
        int qty = req.quantity() == null ? 1 : req.quantity();
        if (qty < 1 || qty > 50) throw ApiException.badRequest("Số lượng mỗi món từ 1 đến 50.");

        OrderItem line = new OrderItem();
        line.setMenuItem(item);
        line.setQuantity(qty);
        line.setUnitPrice(item.getBasePrice());
        if (req.sizeId() != null) {
            MenuItem size = option(req.sizeId(), Category.SIZE);
            line.setSizeName(size.getName());
            line.setSizePrice(size.getBasePrice());
        }
        List<ToppingView> toppings = new ArrayList<>();
        if (req.toppingIds() != null) {
            for (Long id : new LinkedHashSet<>(req.toppingIds())) {
                MenuItem t = option(id, Category.TOPPING);
                toppings.add(new ToppingView(t.getId(), t.getName(), t.getBasePrice()));
            }
        }
        line.setToppingPrice(toppings.stream().mapToLong(ToppingView::price).sum());
        line.setToppingDetails(toppings.isEmpty() ? null : writeJson(toppings));
        line.setSugarLevel(blankToNull(req.sugarLevel()));
        line.setIceLevel(blankToNull(req.iceLevel()));
        line.setNote(blankToNull(req.note()));
        line.setItemStatus(OrderItem.PENDING);
        line.recalcSubtotal();
        return line;
    }

    private MenuItem option(Long id, String group) {
        MenuItem m = menuItemRepository.findById(id)
                .orElseThrow(() -> ApiException.badRequest("Lựa chọn không tồn tại (id = " + id + ")."));
        if (!group.equalsIgnoreCase(m.getCategory().getName())) {
            throw ApiException.badRequest("\"" + m.getName() + "\" không phải lựa chọn " + group + ".");
        }
        if (!MenuItem.AVAILABLE.equals(m.getAvailabilityStatus())) {
            throw ApiException.badRequest("Lựa chọn \"" + m.getName() + "\" hiện đang hết.");
        }
        return m;
    }

    /** Mã đơn dạng yyMMdd-0001 (đánh số lại mỗi ngày). */
    public String nextOrderNumber() {
        String prefix = LocalDate.now().format(DAY) + "-";
        return prefix + String.format("%04d", orderRepository.countByOrderNumberStartingWith(prefix) + 1);
    }

    /** Mã thanh toán dạng PMyyMMdd-0001. */
    public String nextPaymentCode() {
        String prefix = "PM" + LocalDate.now().format(DAY) + "-";
        return prefix + String.format("%04d", paymentRepository.countByPaymentCodeStartingWith(prefix) + 1);
    }

    /** Số ngắn để gọi đơn: "261002-0007" -> "#0007". */
    public static String displayNumber(String orderNumber) {
        if (orderNumber == null) return "";
        int i = orderNumber.lastIndexOf('-');
        return "#" + (i >= 0 ? orderNumber.substring(i + 1) : orderNumber);
    }

    /**
     * Hủy đơn còn chờ pha (Barista hết nguyên liệu / Phục vụ hủy theo yêu cầu khách).
     * Đơn đã thu tiền trước (tại bàn, mang đi, online) không hủy ở đây vì cần hoàn tiền.
     */
    public void cancelPendingOrder(Order order, String reason) {
        if (!order.isWaitingForPreparation()) {
            throw ApiException.badRequest("Đơn " + displayNumber(order.getOrderNumber()) + " đã bắt đầu pha, không hủy được nữa.");
        }
        if (order.isPaid() || paymentRepository.existsByOrder_IdAndPaymentStatus(order.getId(), Payment.PAID)) {
            throw ApiException.badRequest("Đơn " + displayNumber(order.getOrderNumber())
                    + " đã thanh toán trước nên không hủy ở đây được. Vui lòng báo thu ngân.");
        }
        order.moveTo(Order.CANCELLED, OrderItem.CANCELLED);
        order.setCancelReason(reason);
        order.setCancelledAt(LocalDateTime.now());
        orderRepository.saveAndFlush(order);
        closeSessionIfEmpty(order.getTableSession());
        // Các đơn còn lại của bàn đều đã phục vụ và đã thanh toán -> trả bàn.
        closeSessionIfSettled(order.getTableSession());
    }

    /**
     * Lấy lượt khách đang mở của bàn, chưa có thì mở lượt mới và chuyển bàn sang OCCUPIED.
     * Dùng khi tạo đơn tại bàn (QR / Gọi món) - màn hình của KhoiBM.
     */
    public TableSession currentOrOpenSession(CafeTable table) {
        if (!Boolean.TRUE.equals(table.getActive()) || CafeTable.UNAVAILABLE.equals(table.getStatus())) {
            throw ApiException.badRequest(table.getTableNumber() + " đang tạm ngưng phục vụ.");
        }
        return sessionRepository.findFirstByTable_IdAndStatusIn(table.getId(),
                        List.of(TableSession.OPEN, TableSession.PAYMENT_PENDING))
                .orElseGet(() -> {
                    TableSession s = new TableSession();
                    s.setTable(table);
                    s.setStatus(TableSession.OPEN);
                    s.setSessionCode(nextSessionCode());
                    table.setStatus(CafeTable.OCCUPIED);
                    return sessionRepository.save(s);
                });
    }

    /** Mã lượt khách dạng SSyyMMdd-0001. */
    public String nextSessionCode() {
        String prefix = "SS" + LocalDate.now().format(DAY) + "-";
        return prefix + String.format("%04d", sessionRepository.countBySessionCodeStartingWith(prefix) + 1);
    }

    /** Phiên bàn không còn đơn hợp lệ nào -> hủy phiên, trả bàn về trống. */
    public void closeSessionIfEmpty(TableSession session) {
        if (session == null || !session.isActive()) return;
        if (orderRepository.existsByTableSession_IdAndStatusNot(session.getId(), Order.CANCELLED)) return;
        session.setStatus(TableSession.CANCELLED);
        session.setClosedAt(LocalDateTime.now());
        session.getTable().setStatus(CafeTable.AVAILABLE);
    }

    /**
     * Lượt khách xong khi mọi đơn chưa hủy đều ĐÃ PHỤC VỤ và ĐÃ THANH TOÁN -> đóng lượt (CLOSED),
     * trả bàn về trống (GB-04). Gọi sau khi thu tiền, sau khi mang món ra và sau khi hủy đơn.
     * Trả về true nếu vừa đóng.
     */
    public boolean closeSessionIfSettled(TableSession session) {
        if (session == null || !session.isActive()) return false;
        List<Order> valid = orderRepository.findByTableSession_IdOrderByCreatedAtAsc(session.getId()).stream()
                .filter(o -> !o.isCancelled())
                .toList();
        if (valid.isEmpty() || !valid.stream().allMatch(Order::isSettled)) return false;
        session.setStatus(TableSession.CLOSED);
        session.setClosedAt(LocalDateTime.now());
        session.getTable().setStatus(CafeTable.AVAILABLE);
        return true;
    }

    // ===== Entity -> DTO =====

    public OrderView toView(Order o) {
        TableSession s = o.getTableSession();
        CafeTable t = s == null ? null : s.getTable();
        return new OrderView(o.getId(), o.getOrderNumber(), displayNumber(o.getOrderNumber()), o.getStatus(),
                o.getSource(), o.getFulfillmentType(),
                s == null ? null : s.getId(), t == null ? null : t.getId(), t == null ? null : t.getTableNumber(),
                o.getCustomerName(), o.getCustomerPhone(), o.getCustomerNote(), o.getCancelReason(),
                o.activeTotal(), o.getCreatedAt(), o.getUpdatedAt(),
                o.getItems().stream().map(this::toItemView).toList(),
                o.getPaymentStatus(), o.getPaidAt(), o.getPayment() == null ? null : o.getPayment().getId());
    }

    public OrderItemView toItemView(OrderItem i) {
        return new OrderItemView(i.getId(), i.getMenuItem().getId(), i.getMenuItem().getName(), i.getQuantity(),
                nz(i.getUnitPrice()), i.getSizeName(), nz(i.getSizePrice()), readToppings(i.getToppingDetails()),
                nz(i.getToppingPrice()), i.getSugarLevel(), i.getIceLevel(), i.getNote(), i.getItemStatus(),
                nz(i.getSubtotal()));
    }

    public List<ToppingView> readToppings(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<ToppingView>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private String writeJson(List<ToppingView> toppings) {
        try {
            return objectMapper.writeValueAsString(toppings);
        } catch (Exception e) {
            throw ApiException.badRequest("Không lưu được topping.");
        }
    }

    private static long nz(Long v) { return v == null ? 0 : v; }

    public static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
