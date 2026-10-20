package com.example.project.service;

import com.example.project.dto.order.OrderItemView;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.waiter.IncidentItemRequest;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.OrderItemRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UC-W08 Confirm Orders as Served.
 * Phục vụ: theo dõi đơn tại bàn (món chờ pha / chờ mang ra), mang ra và tích TỪNG MÓN; đủ món thì đơn tự xong.
 * Hỗ trợ ghi nhận sự cố làm vỡ / đổ món trước khi giao khách (bù món / hủy món).
 * Thu ngân: giao cả đơn mang đi một lần.
 */
@Service
public class ServingService {

    private static final List<String> ACTIVE_STATUSES =
            List.of(Order.PENDING, Order.CONFIRMED, Order.PREPARING, Order.READY);
    private static final int NOTE_MAX = 300; // = độ dài cột order_items.note

    private final OrderRepository orderRepository;
    private final OrderItemRepository itemRepository;
    private final OrderLockRepository lockRepository;
    private final OrderSupportService support;

    public ServingService(OrderRepository orderRepository, OrderItemRepository itemRepository,
                          OrderLockRepository lockRepository, OrderSupportService support) {
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
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

    /**
     * Báo cáo sự cố làm đổ/vỡ ly khi đang mang ra cho khách (UC-W08).
     * Tận dụng database hiện có (không đổi schema):
     * - Khách đợi (action = REMAKE): Món chuyển về PENDING (Chờ pha), Order sync sang PREPARING.
     *   Tổng tiền đơn GIỮ NGUYÊN (Khách chỉ trả tiền 1 ly ban đầu).
     * - Khách không đợi (action = CANCEL): Món chuyển sang CANCELLED.
     *   Tổng tiền đơn TỰ ĐỘNG GIẢM TRỪ (Khách không bị tính tiền cốc bị vỡ).
     * - Ghi nhận biên bản sự cố / mức phạt vào trường note của OrderItem: [SỰ CỐ: ...]
     */
    @Transactional
    public OrderView reportIncident(Long orderId, Long itemId, IncidentItemRequest req, User waiter) {
        Order o = lockRepository.findWithLockById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + orderId));
        if (!Order.DINE_IN.equals(o.getFulfillmentType())) {
            throw ApiException.badRequest("Phục vụ chỉ báo sự cố món của đơn tại bàn.");
        }
        OrderItem line = o.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Món không thuộc đơn này."));

        if (!OrderItem.READY.equals(line.getItemStatus())) {
            throw ApiException.badRequest("Chỉ có thể báo sự cố cho món đang Chờ mang ra (đã pha xong).");
        }

        support.ensureNotInPendingQr(o, "báo sự cố");

        String action = req.action() == null ? "REMAKE" : req.action().trim().toUpperCase();
        if ("CANCEL".equals(action) && o.isPaid()) {
            throw ApiException.badRequest("Đơn này đã thanh toán. Vui lòng chọn 'Pha lại' hoặc liên hệ Thu ngân hoàn tiền trước khi hủy món.");
        }

        String staffName = (waiter != null && waiter.getFullName() != null && !waiter.getFullName().isBlank())
                ? waiter.getFullName()
                : (waiter != null ? waiter.getUsername() : "Phục vụ");
        String reason = (req.reason() == null || req.reason().isBlank()) ? "Làm đổ/vỡ khi mang ra" : req.reason().trim();
        long penalty = (req.penaltyAmount() != null && req.penaltyAmount() > 0) ? req.penaltyAmount() : 0L;
        String penaltyText = penalty > 0 ? " | Phạt: " + String.format("%,dđ", penalty) : "";

        // Tách ghi chú gốc của khách nếu trước đó đã có tag sự cố (tag chỉ có đúng 1 dấu ']' ở cuối)
        String originalNote = line.getNote() != null ? line.getNote().trim() : "";
        if (originalNote.startsWith("[SỰ CỐ") && originalNote.contains("]")) {
            int closeBracket = originalNote.indexOf(']');
            originalNote = originalNote.substring(closeBracket + 1).replaceFirst("^\\s*-\\s*", "").trim();
        }

        if ("REMAKE".equals(action)) {
            line.setItemStatus(OrderItem.PENDING);
            line.setNote(incidentNote("PHA LẠI", staffName, penaltyText, reason, originalNote));
        } else if ("CANCEL".equals(action)) {
            line.setItemStatus(OrderItem.CANCELLED);
            line.setNote(incidentNote("HỦY MÓN", staffName, penaltyText, reason, originalNote));
        } else {
            throw ApiException.badRequest("Hướng xử lý chỉ được chọn REMAKE (Pha lại) hoặc CANCEL (Hủy món).");
        }

        o.syncStatusFromItems();
        o.recalcTotal();
        if (o.isCancelled()) o.setCancelReason("Sự cố: " + reason);
        orderRepository.saveAndFlush(o);

        support.closeSessionIfEmpty(o.getTableSession());   // hủy hết món, bàn không còn đơn nào -> trả bàn trống
        support.closeSessionIfSettled(o.getTableSession()); // các đơn còn lại đã phục vụ + đã thanh toán -> đóng lượt
        return support.toView(o);
    }

    /** Danh sách các món từng ghi nhận sự cố vỡ / đổ. */
    @Transactional(readOnly = true)
    public List<OrderItemView> listIncidents() {
        return itemRepository.findByNoteContainingOrderByIdDesc("[SỰ CỐ").stream()
                .map(support::toItemView)
                .toList();
    }

    /**
     * Ghép note món = "[SỰ CỐ: ... | Lý do: ...] - ghi chú của khách", tối đa NOTE_MAX ký tự.
     * Ưu tiên giữ nguyên ghi chú của khách: lý do bị rút gọn cho vừa chỗ còn lại.
     * Tên NV / lý do được đổi '[' ']' thành '(' ')' để tag luôn kết thúc đúng ở dấu ']' duy nhất.
     */
    private static String incidentNote(String label, String staffName, String penaltyText,
                                       String reason, String customerNote) {
        String head = "[SỰ CỐ: " + label + " | NV: " + noBrackets(staffName) + penaltyText + " | Lý do: ";
        String sep = customerNote.isBlank() ? "" : " - ";
        int room = NOTE_MAX - head.length() - 1 - sep.length() - customerNote.length();
        String note = head + shorten(noBrackets(reason), room) + "]" + sep + customerNote;
        // Ghi chú khách quá dài, không còn chỗ cho lý do: tag vẫn giữ nguyên, đành cắt phần cuối ghi chú khách.
        return note.length() > NOTE_MAX ? note.substring(0, NOTE_MAX) : note;
    }

    private static String noBrackets(String s) {
        return s.replace('[', '(').replace(']', ')');
    }

    private static String shorten(String s, int max) {
        if (s.length() <= max) return s;
        return max <= 3 ? "..." : s.substring(0, max - 3) + "...";
    }
}
