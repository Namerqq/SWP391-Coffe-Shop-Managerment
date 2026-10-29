package com.example.project.service;

import com.example.project.dto.cashier.CancelItemRequest;
import com.example.project.dto.order.OrderView;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.TableSession;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bỏ món chưa phục vụ khi thanh toán (ThangNN Iter3, Template 6 "Bỏ món chưa phục vụ khi thanh toán (Cashier)").
 * Tình huống: lúc thanh toán khách báo vài món chưa được mang ra và không dùng nữa -> thu ngân bỏ món đó
 * khỏi hóa đơn rồi thu phần còn lại.
 * - Chỉ đơn tại bàn, CHƯA thanh toán, không nằm trong mã QR đang chờ quét.
 *   Đơn đã thanh toán thì bỏ món cần hoàn tiền -> làm ở phần Refund, không làm ở đây.
 * - Món Chờ pha: hủy luôn, pha chế không còn thấy món này, chưa tốn nguyên liệu.
 * - Món Chờ mang ra (đã pha xong, kho đã trừ): hủy + ghi 1 biên bản sự cố (action CANCEL) để quản lý xem.
 * - Món đã mang ra cho khách: không bỏ được.
 * Bỏ hết món thì đơn tự hủy; bàn không còn đơn nào / mọi đơn còn lại đã xong thì trả bàn về trống.
 */
@Service
public class CashierItemService {

    public static final String DEFAULT_REASON = "Khách không dùng nữa";
    static final String INCIDENT_PREFIX = "Thu ngân bỏ món khi thanh toán, món đã pha xong nhưng chưa mang ra. Lý do: ";
    private static final int INCIDENT_REASON_MAX = 300;

    private final OrderLockRepository lockRepository;
    private final OrderRepository orderRepository;
    private final OrderSupportService support;
    private final IncidentReportService incidentService;

    public CashierItemService(OrderLockRepository lockRepository, OrderRepository orderRepository,
                              OrderSupportService support, IncidentReportService incidentService) {
        this.lockRepository = lockRepository;
        this.orderRepository = orderRepository;
        this.support = support;
        this.incidentService = incidentService;
    }

    @Transactional
    public OrderView cancelUnservedItem(Long orderId, Long itemId, CancelItemRequest req, User cashier) {
        // Khóa dòng đơn: pha chế / phục vụ / thu ngân khác đang thao tác cùng đơn thì chờ nhau, không ghi đè.
        Order o = lockRepository.findWithLockById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + orderId));
        String num = OrderSupportService.displayNumber(o.getOrderNumber());
        if (!Order.DINE_IN.equals(o.getFulfillmentType())) {
            throw ApiException.badRequest("Chỉ bỏ món được ở đơn tại bàn.");
        }
        if (o.isCancelled()) {
            throw ApiException.conflict("Đơn " + num + " đã hủy.");
        }
        if (o.isPaid()) {
            throw ApiException.badRequest("Đơn " + num + " đã thanh toán, bỏ món cần hoàn tiền cho khách nên chưa làm ở đây được.");
        }
        support.ensureNotInPendingQr(o, "bỏ món");

        OrderItem line = o.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Món không thuộc đơn này."));
        String name = line.getMenuItem().getName();
        if (line.isCancelled()) {
            throw ApiException.conflict("Món " + name + " đã được hủy trước đó.");
        }
        if (OrderItem.SERVED.equals(line.getItemStatus())) {
            throw ApiException.badRequest("Món " + name + " đã mang ra cho khách, không bỏ được.");
        }
        if (req != null && req.expectedStatus() != null && !req.expectedStatus().isBlank()
                && group(req.expectedStatus().trim().toUpperCase()) != group(line.getItemStatus())) {
            throw ApiException.conflict("Món " + name + " vừa đổi trạng thái. Vui lòng xem lại hóa đơn trước khi bỏ món.");
        }

        boolean alreadyMade = OrderItem.READY.equals(line.getItemStatus());
        String reason = OrderSupportService.blankToNull(req == null ? null : req.reason());
        if (reason == null) reason = DEFAULT_REASON;

        line.setItemStatus(OrderItem.CANCELLED);
        o.recalcTotal();
        o.syncStatusFromItems();
        if (o.isCancelled()) o.setCancelReason(reason); // bỏ hết món -> đơn tự hủy
        orderRepository.saveAndFlush(o);

        // Món đã pha xong thì đã trừ kho: ghi biên bản để quản lý xem (hiện ở màn Sự cố, cột người báo = thu ngân).
        if (alreadyMade) {
            incidentService.create(line, cashier, IncidentReport.CANCEL, incidentReason(reason));
        }

        TableSession s = o.getTableSession();
        support.closeSessionIfEmpty(s);   // bàn không còn đơn hợp lệ nào -> trả bàn trống
        support.closeSessionIfSettled(s); // các đơn còn lại đều đã phục vụ + đã thanh toán -> đóng lượt
        return support.toView(o);
    }

    static String incidentReason(String reason) {
        String text = INCIDENT_PREFIX + reason;
        return text.length() > INCIDENT_REASON_MAX ? text.substring(0, INCIDENT_REASON_MAX) : text;
    }

    /** 0 = chờ pha (PENDING, PREPARING cũ), 1 = chờ mang ra, 2 = đã mang ra, 3 = đã hủy. */
    private static int group(String itemStatus) {
        if (OrderItem.PENDING.equals(itemStatus) || OrderItem.PREPARING.equals(itemStatus)) return 0;
        if (OrderItem.READY.equals(itemStatus)) return 1;
        if (OrderItem.SERVED.equals(itemStatus)) return 2;
        return 3;
    }
}
