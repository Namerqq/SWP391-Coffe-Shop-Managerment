package com.example.project.service;

import com.example.project.dto.order.OrderView;
import com.example.project.dto.waiter.IncidentItemRequest;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.User;
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
 * Hỗ trợ ghi nhận sự cố làm vỡ / đổ món trước khi giao khách (bù món / hủy món).
 * Thu ngân: giao cả đơn mang đi một lần.
 */
@Service
public class ServingService {

    private static final List<String> ACTIVE_STATUSES =
            List.of(Order.PENDING, Order.CONFIRMED, Order.PREPARING, Order.READY);
    private static final String CUSTOMER_NOT_REMAKE = "Khách không dùng món nữa";

    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final OrderSupportService support;
    private final IncidentReportService incidentService;

    public ServingService(OrderRepository orderRepository, OrderLockRepository lockRepository,
                          OrderSupportService support, IncidentReportService incidentService) {
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.support = support;
        this.incidentService = incidentService;
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
     * - Khách muốn làm lại (action = REMAKE): món chuyển về PENDING (Chờ pha) để pha chế làm lại.
     *   Tổng tiền đơn GIỮ NGUYÊN (khách chỉ trả tiền 1 ly ban đầu).
     *   Đơn của ngày trước không làm lại được (pha chế không còn thấy đơn đó).
     * - Khách không muốn làm lại (action = CANCEL): món chuyển sang CANCELLED, không tính tiền món này.
     * - Lưu 1 biên bản vào bảng incident_reports để quản lý xem xét, quyết định mức phạt.
     *   Thông tin sự cố là nội bộ: KHÔNG ghi vào ghi chú món nên khách không thấy.
     * - quantity: chỉ vài ly của dòng bị đổ / vỡ (vd 1 trong 2× Latte) -> tách các ly đó thành dòng riêng,
     *   ly còn lại vẫn Chờ mang ra; biên bản gắn với dòng mới tách. null = cả dòng.
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

        String action = req.action() == null ? IncidentReport.REMAKE : req.action().trim().toUpperCase();
        if (IncidentReport.CANCEL.equals(action) && o.isPaid()) {
            throw ApiException.badRequest("Đơn này đã thanh toán. Vui lòng chọn 'Khách muốn làm lại' hoặc liên hệ Thu ngân hoàn tiền trước khi hủy món.");
        }
        // Đơn ngày trước đã ẩn khỏi bảng pha chế (và cột Chờ pha của phục vụ): gửi lại pha thì không ai thấy để làm,
        // món sẽ kẹt mãi ở Chờ pha. Chỉ cho hủy món (chưa thanh toán) hoặc báo thu ngân hoàn tiền (đã thanh toán).
        if (IncidentReport.REMAKE.equals(action) && o.isFromPreviousDay()) {
            String num = OrderSupportService.displayNumber(o.getOrderNumber());
            throw ApiException.badRequest(o.isPaid()
                    ? "Đơn " + num + " là đơn của ngày trước, pha chế không làm lại được nữa. Đơn đã thanh toán: vui lòng báo Thu ngân hoàn tiền món này."
                    : "Đơn " + num + " là đơn của ngày trước, pha chế không làm lại được nữa. Vui lòng chọn 'Khách không muốn làm lại' (hủy món).");
        }
        String reason = (req.reason() == null || req.reason().isBlank()) ? "Làm đổ/vỡ khi mang ra" : req.reason().trim();
        if (!IncidentReport.REMAKE.equals(action) && !IncidentReport.CANCEL.equals(action)) {
            throw ApiException.badRequest("Hướng xử lý chỉ được chọn REMAKE (Làm lại) hoặc CANCEL (Không làm lại).");
        }
        Integer qty = req.quantity();
        if (qty != null && (qty < 1 || qty > line.getQuantity())) {
            throw ApiException.badRequest("Số ly bị sự cố phải từ 1 đến " + line.getQuantity() + ".");
        }
        OrderItem broken = o.splitItem(line, qty);

        if (IncidentReport.REMAKE.equals(action)) {
            broken.setItemStatus(OrderItem.PENDING); // gửi lại pha chế làm lại
        } else {
            broken.setItemStatus(OrderItem.CANCELLED); // khách không muốn làm lại, không tính tiền món này
        }

        o.syncStatusFromItems();
        o.recalcTotal();
        if (o.isCancelled()) o.setCancelReason(CUSTOMER_NOT_REMAKE); // lý do khách nhìn thấy, không nhắc tới sự cố
        // Dùng flush (không dùng saveAndFlush): saveAndFlush merge đơn nên dòng vừa tách được lưu bằng bản sao,
        // biến broken vẫn chưa có id và biên bản bên dưới sẽ lỗi. Đơn đang được quản lý trong transaction nên flush là đủ.
        orderRepository.flush();

        // Lưu biên bản sự cố (nội bộ) để quản lý xem xét và quyết định mức phạt
        incidentService.create(broken, waiter, action, reason);

        support.closeSessionIfEmpty(o.getTableSession());   // hủy hết món, bàn không còn đơn nào -> trả bàn trống
        support.closeSessionIfSettled(o.getTableSession()); // các đơn còn lại đã phục vụ + đã thanh toán -> đóng lượt
        return support.toView(o);
    }
}
