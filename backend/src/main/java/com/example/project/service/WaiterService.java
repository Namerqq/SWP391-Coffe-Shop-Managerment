package com.example.project.service;

import com.example.project.dto.order.OrderItemRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.dto.order.SessionView;
import com.example.project.entity.CafeTable;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.TableSession;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CafeTableRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.TableSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * UC-W05 Modifying Pending Orders, UC-W06 Change item details, UC-W07 Cancel pending orders.
 * Hỗ trợ đổi bàn cho khách (chuyển lượt khách / session sang bàn trống khác).
 */
@Service
public class WaiterService {

    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final OrderSupportService support;
    private final CafeTableRepository tableRepository;
    private final TableSessionRepository sessionRepository;
    private final TableBoardService tableBoardService;

    public WaiterService(OrderRepository orderRepository, OrderLockRepository lockRepository,
                         OrderSupportService support, CafeTableRepository tableRepository,
                         TableSessionRepository sessionRepository, TableBoardService tableBoardService) {
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.support = support;
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.tableBoardService = tableBoardService;
    }

    /**
     * Sửa số lượng / size / đường / đá / topping / ghi chú hoặc đổi sang món khác
     * (giá tính lại theo menu hiện tại).
     */
    @Transactional
    public OrderView updateItem(Long orderId, Long itemId, OrderItemRequest req) {
        Order o = findEditable(orderId);
        OrderItem line = findLine(o, itemId);
        Long targetItemId = req.menuItemId() != null ? req.menuItemId() : line.getMenuItem().getId();
        OrderItem fresh = support.buildItem(new OrderItemRequest(targetItemId, req.quantity(),
                req.sizeId(), req.toppingIds(), req.sugarLevel(), req.iceLevel(), req.note()));
        line.setMenuItem(fresh.getMenuItem());
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

    /** Đọc đơn kèm khóa dòng để không sửa chồng lên lúc thu ngân đang thu tiền đơn này. */
    private Order findEditable(Long orderId) {
        Order o = lockRepository.findWithLockById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + orderId));
        if (!Order.DINE_IN.equals(o.getFulfillmentType())) {
            throw ApiException.badRequest("Phục vụ chỉ sửa / hủy được đơn tại bàn.");
        }
        if (!o.isWaitingForPreparation()) {
            throw ApiException.badRequest("Đơn " + OrderSupportService.displayNumber(o.getOrderNumber())
                    + " đã bắt đầu pha, không sửa / hủy được nữa.");
        }
        // Đơn đã thu tiền: sửa / bỏ món làm lệch số tiền đã thu, hủy thì cần hoàn tiền -> báo thu ngân.
        if (o.isPaid()) {
            throw ApiException.badRequest("Đơn " + OrderSupportService.displayNumber(o.getOrderNumber())
                    + " đã thanh toán, không sửa / hủy được nữa. Vui lòng báo thu ngân.");
        }
        // Đơn đang nằm trong mã QR chờ khách quét: sửa / bỏ món làm lệch số tiền trong mã.
        support.ensureNotInPendingQr(o, "sửa / hủy");
        return o;
    }

    private static OrderItem findLine(Order o, Long itemId) {
        return o.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Món không thuộc đơn này."));
    }

    /**
     * Hỗ trợ đổi bàn cho khách: chuyển lượt khách (session) từ bàn hiện tại sang bàn trống khác.
     * Mọi đơn của lượt khách này tự động thuộc về bàn mới; bàn cũ trả về trống, bàn mới chuyển sang có khách.
     */
    @Transactional
    public SessionView changeTable(Long currentTableId, Long targetTableId) {
        if (currentTableId == null || targetTableId == null) {
            throw ApiException.badRequest("Mã bàn không hợp lệ.");
        }
        if (currentTableId.equals(targetTableId)) {
            throw ApiException.badRequest("Bàn chuyển đến phải khác bàn hiện tại.");
        }

        CafeTable currentTable = tableRepository.findById(currentTableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn hiện tại id = " + currentTableId));

        TableSession session = sessionRepository.findFirstByTable_IdAndStatusIn(currentTableId,
                        List.of(TableSession.OPEN, TableSession.PAYMENT_PENDING))
                .orElseThrow(() -> ApiException.badRequest("Bàn " + currentTable.getTableNumber() + " hiện không có khách để đổi."));

        CafeTable targetTable = tableRepository.findById(targetTableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn đích id = " + targetTableId));

        if (!Boolean.TRUE.equals(targetTable.getActive()) || CafeTable.UNAVAILABLE.equals(targetTable.getStatus())) {
            throw ApiException.badRequest("Bàn " + targetTable.getTableNumber() + " đang tạm ngưng phục vụ.");
        }

        boolean targetBusy = sessionRepository.findFirstByTable_IdAndStatusIn(targetTableId,
                List.of(TableSession.OPEN, TableSession.PAYMENT_PENDING)).isPresent();
        if (targetBusy || CafeTable.OCCUPIED.equals(targetTable.getStatus())) {
            throw ApiException.badRequest("Bàn " + targetTable.getTableNumber() + " đang có khách, không thể đổi sang bàn này.");
        }

        // 1. Trả bàn cũ về AVAILABLE
        currentTable.setStatus(CafeTable.AVAILABLE);
        tableRepository.save(currentTable);

        // 2. Chuyển bàn mới sang OCCUPIED
        targetTable.setStatus(CafeTable.OCCUPIED);
        tableRepository.save(targetTable);

        // 3. Gắn session sang bàn mới
        session.setTable(targetTable);
        sessionRepository.save(session);

        return tableBoardService.toSessionView(session);
    }
}
