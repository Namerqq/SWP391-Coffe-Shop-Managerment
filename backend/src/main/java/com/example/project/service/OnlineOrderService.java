package com.example.project.service;

import com.example.project.dto.online.OnlineOrderRequest;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service xử lý đơn hàng online (UC-CU05 Place Online Order).
 * Quy tắc:
 * 1. Giá được tính lại 100% ở server qua OrderSupportService (chống sửa giá từ client).
 * 2. COD: Đơn ở trạng thái CONFIRMED (gửi thẳng cho Barista pha chế luôn).
 * 3. QR: Đơn ở trạng thái PENDING (chờ khách quét mã thanh toán, sau khi thanh toán mới gửi Barista).
 * 4. Tạo kèm bản ghi trong bảng deliveries (địa chỉ giao, trạng thái PENDING_ASSIGNMENT).
 */
@Service
public class OnlineOrderService {

    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final OrderSupportService orderSupport;
    private final OrderLockRepository lockRepository;

    public OnlineOrderService(OrderRepository orderRepository,
                              DeliveryRepository deliveryRepository,
                              OrderSupportService orderSupport,
                              OrderLockRepository lockRepository) {
        this.orderRepository = orderRepository;
        this.deliveryRepository = deliveryRepository;
        this.orderSupport = orderSupport;
        this.lockRepository = lockRepository;
    }

    /**
     * Khách đặt đơn online.
     */
    @Transactional
    public OnlineOrderView placeOrder(OnlineOrderRequest req) {
        if (req.items() == null || req.items().isEmpty()) {
            throw ApiException.badRequest("Giỏ hàng đang trống, chưa chọn món nào.");
        }
        // ThangNN Iter2 (D2): đơn trả QR chỉ được tạo SAU khi khách trả xong, qua POST /api/public/online/qr-payments.
        if ("PAYOS_QR".equalsIgnoreCase(req.paymentMethodOrDefault())) {
            throw ApiException.badRequest("Đơn trả bằng QR được tạo sau khi thanh toán, vui lòng thanh toán ở trang mã QR.");
        }

        // 1. Tạo đơn hàng (Order)
        Order order = new Order();
        order.setOrderNumber(orderSupport.nextOrderNumber());
        order.setSource(Order.SOURCE_ONLINE);
        order.setFulfillmentType(Order.DELIVERY);
        order.setCustomerName(req.customerName().trim());
        order.setCustomerPhone(req.customerPhone().trim());
        order.setCustomerNote(OrderSupportService.blankToNull(req.note()));

        // 2. Tính lại giá từng món ở server qua OrderSupportService (bảo mật)
        req.items().forEach(itemReq -> order.addItem(orderSupport.buildItem(itemReq)));
        order.recalcTotal();

        // 3. Đơn mới tạo online luôn bắt đầu ở trạng thái PENDING_CONFIRMATION (Bước 1: "Đã nhận đơn")
        // Ở bước này khách được phép hủy đơn trước khi quán duyệt/xác nhận
        boolean isQr = "PAYOS_QR".equalsIgnoreCase(req.paymentMethodOrDefault());
        order.setStatus(Order.PENDING);
        order.setPaymentStatus(Order.UNPAID);

        Order savedOrder = orderRepository.save(order);

        // 4. Tạo bản ghi giao hàng (Delivery) trong bảng deliveries có sẵn
        Delivery delivery = new Delivery();
        delivery.setOrder(savedOrder);
        delivery.setDeliveryAddress(req.deliveryAddress().trim());
        delivery.setDeliveryStatus(Delivery.STATUS_PENDING_ASSIGNMENT);
        Delivery savedDelivery = deliveryRepository.save(delivery);

        return toView(savedOrder, savedDelivery, isQr ? "PAYOS_QR" : "CASH", null);
    }

    /**
     * Theo dõi đơn online bằng mã đơn khách nhập (dạng 261023-0008). Khách chỉ xem được đơn mình có mã,
     * không còn tra theo SĐT hay theo id (để không liệt kê / dò được đơn của người khác).
     */
    @Transactional(readOnly = true)
    public OnlineOrderView getOrderByCode(String code) {
        Order order = findOnlineByCode(code);
        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId()).orElse(null);
        String paymentMethod = Order.PENDING.equals(order.getStatus()) ? "PAYOS_QR" : "CASH";
        return toView(order, delivery, paymentMethod, null);
    }

    private Order findOnlineByCode(String code) {
        String c = OrderSupportService.normalizeOrderCode(code);
        return orderRepository.findFirstByOrderNumberAndSourceOrderByIdDesc(c, Order.SOURCE_ONLINE)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn đặt online có mã " + c + "."));
    }

    /**
     * Khách hàng tự hủy đơn hàng online (theo mã đơn).
     * Chỉ cho phép hủy khi đơn còn ở trạng thái chờ (chưa pha chế / chưa giao hàng).
     */
    @Transactional
    public OnlineOrderView cancelOrder(String code, String reason) {
        // Đọc đơn kèm khóa dòng (lần đọc đầu tiên trong transaction nên luôn là trạng thái mới nhất):
        // thu ngân xác nhận / hủy cùng lúc thì ai lấy khóa trước người đó thắng, người sau bị từ chối bên dưới.
        String c = OrderSupportService.normalizeOrderCode(code);
        Order order = lockRepository.findFirstWithLockByOrderNumberAndSourceOrderByIdDesc(c, Order.SOURCE_ONLINE)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn đặt online có mã " + c + "."));

        if (order.isCancelled()) {
            throw ApiException.badRequest("Đơn hàng này đã được hủy trước đó.");
        }

        // Chỉ cho phép hủy khi đơn còn ở Bước 1: "Đã nhận đơn" (PENDING_CONFIRMATION).
        // Khi quán đã chuyển sang Bước 2 (CONFIRMED / PREPARING) thì lập tức khóa hủy!
        if (!Order.PENDING.equals(order.getStatus())) {
            throw ApiException.badRequest("Đơn hàng đã được quán xác nhận hoặc đang chuẩn bị, không thể hủy.");
        }

        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId()).orElse(null);
        if (delivery != null && (Delivery.STATUS_OUT_FOR_DELIVERY.equals(delivery.getDeliveryStatus())
                || Delivery.STATUS_DELIVERED.equals(delivery.getDeliveryStatus())
                || Delivery.STATUS_PICKED_UP.equals(delivery.getDeliveryStatus()))) {
            throw ApiException.badRequest("Đơn hàng đang trên đường giao, không thể hủy.");
        }

        order.moveTo(Order.CANCELLED, OrderItem.CANCELLED);
        String finalReason = (reason != null && !reason.isBlank()) ? reason.trim() : "Khách hàng hủy đơn";
        order.setCancelReason(finalReason);
        order.setCancelledAt(LocalDateTime.now());
        orderRepository.save(order);

        if (delivery != null) {
            delivery.setDeliveryStatus(Delivery.STATUS_CANCELLED);
            deliveryRepository.save(delivery);
        }

        return toView(order, delivery, null, null);
    }

    /**
     * Danh sách tất cả đơn giao hàng (DELIVERY) cho Thu ngân (Cashier).
     * Mới nhất xếp trước.
     */
    @Transactional(readOnly = true)
    public List<OnlineOrderView> listDeliveryOrders() {
        return listDeliveryOrders(null, null, null);
    }

    /**
     * Danh sách đơn giao hàng có lọc: thời gian đặt đơn trong [from, to) và / hoặc mã đơn.
     * Bỏ trống cả 3 = mọi đơn (như trước). code nhập 1 phần cũng được ("0012", "#0012", "261025-00").
     */
    @Transactional(readOnly = true)
    public List<OnlineOrderView> listDeliveryOrders(LocalDateTime from, LocalDateTime to, String code) {
        if (from != null && to != null && !from.isBefore(to)) {
            throw ApiException.badRequest("Thời gian bắt đầu phải trước thời gian kết thúc.");
        }
        String c = normalizeSearchCode(code);
        List<Order> orders = from == null && to == null && c == null
                ? orderRepository.findByFulfillmentTypeOrderByCreatedAtDesc(Order.DELIVERY)
                : orderRepository.searchByFulfillmentType(Order.DELIVERY, from, to, c);
        return orders.stream().map(o -> {
            Delivery d = deliveryRepository.findByOrder_Id(o.getId()).orElse(null);
            String pm = o.getPayment() != null ? o.getPayment().getPaymentMethod() : (Order.PENDING.equals(o.getStatus()) ? "PAYOS_QR" : "CASH");
            return toView(o, d, pm, null);
        }).toList();
    }

    /** Mã đơn để tìm: bỏ khoảng trắng và dấu #; rỗng = không lọc. Chỉ nhận số và dấu gạch. */
    static String normalizeSearchCode(String code) {
        if (code == null) return null;
        String c = code.replaceAll("[\\s#]", "");
        if (c.isEmpty()) return null;
        if (!c.matches("^[0-9-]{1,20}$")) {
            throw ApiException.badRequest("Mã đơn chỉ gồm số và dấu gạch, vd 261025-0012 hoặc 0012.");
        }
        return c;
    }

    /**
     * Thu ngân xác nhận đơn giao hàng -> chuyển sang CONFIRMED để Pha chế nhận làm.
     * Chỉ đơn đang "Chờ duyệt" mới xác nhận được. 2 thu ngân bấm cùng lúc (xác nhận / hủy) thì chỉ thao tác
     * của người bấm trước có hiệu lực; người bấm sau nhận lỗi 409 kèm trạng thái hiện tại của đơn.
     */
    @Transactional
    public OnlineOrderView confirmDeliveryOrder(Long id) {
        Order order = lockedDeliveryOrder(id);
        requireStillPending(order, "xác nhận");
        order.setStatus(Order.CONFIRMED);
        orderRepository.save(order);

        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId()).orElse(null);
        String pm = order.getPayment() != null ? order.getPayment().getPaymentMethod() : "CASH";
        return toView(order, delivery, pm, null);
    }

    /**
     * Thu ngân hủy đơn giao hàng (ví dụ: hết nguyên liệu, không giao được).
     * Cùng quy tắc với xác nhận: chỉ đơn đang "Chờ duyệt", người bấm trước thắng.
     */
    @Transactional
    public OnlineOrderView cashierCancelDeliveryOrder(Long id, String reason) {
        Order order = lockedDeliveryOrder(id);
        requireStillPending(order, "hủy");

        order.moveTo(Order.CANCELLED, OrderItem.CANCELLED);
        String finalReason = (reason != null && !reason.isBlank()) ? reason.trim() : "Hết nguyên liệu";
        order.setCancelReason(finalReason);
        order.setCancelledAt(LocalDateTime.now());
        orderRepository.save(order);

        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId()).orElse(null);
        if (delivery != null) {
            delivery.setDeliveryStatus(Delivery.STATUS_CANCELLED);
            deliveryRepository.save(delivery);
        }

        String pm = order.getPayment() != null ? order.getPayment().getPaymentMethod() : "CASH";
        return toView(order, delivery, pm, null);
    }

    /** Đọc đơn kèm khóa dòng (SELECT ... FOR UPDATE): thao tác cùng lúc trên 1 đơn phải chờ nhau. */
    private Order lockedOrder(Long id) {
        return lockRepository.findWithLockById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng #" + id));
    }

    private Order lockedDeliveryOrder(Long id) {
        Order order = lockedOrder(id);
        if (!Order.DELIVERY.equals(order.getFulfillmentType())) {
            throw ApiException.notFound("Không tìm thấy đơn giao hàng #" + id);
        }
        return order;
    }

    /**
     * Đơn phải còn "Chờ duyệt" (đọc lại SAU khi đã lấy khóa). Đã có người xác nhận / hủy trước
     * (thu ngân khác hoặc chính khách) thì từ chối, không ghi đè trạng thái.
     */
    private static void requireStillPending(Order order, String action) {
        if (Order.PENDING.equals(order.getStatus())) return;
        String no = OrderSupportService.displayNumber(order.getOrderNumber());
        String now = order.isCancelled()
                ? "đã bị hủy" + (order.getCancelReason() != null ? " (lý do: " + order.getCancelReason() + ")" : "")
                : "đã được xác nhận";
        throw ApiException.conflict("Không " + action + " được: đơn " + no + " " + now
                + " trước đó. Danh sách vừa được cập nhật lại.");
    }

    public OnlineOrderView toView(Order order, Delivery delivery, String paymentMethod, String qrUrl) {
        String deliveryAddr = delivery != null ? delivery.getDeliveryAddress() : "";
        String deliveryStatus = delivery != null ? delivery.getDeliveryStatus() : Delivery.STATUS_PENDING_ASSIGNMENT;

        return new OnlineOrderView(
                order.getId(),
                order.getOrderNumber(),
                OrderSupportService.displayNumber(order.getOrderNumber()),
                order.getStatus(),
                order.getCustomerName(),
                order.getCustomerPhone(),
                deliveryAddr,
                deliveryStatus,
                order.getCustomerNote(),
                order.getCancelReason(),
                paymentMethod,
                order.getPaymentStatus(),
                order.activeTotal(),
                order.getCreatedAt(),
                order.getItems().stream().map(orderSupport::toItemView).toList(),
                qrUrl
        );
    }
}
