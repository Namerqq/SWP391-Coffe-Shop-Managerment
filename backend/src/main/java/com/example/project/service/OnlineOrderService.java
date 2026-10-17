package com.example.project.service;

import com.example.project.dto.online.OnlineOrderRequest;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
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

    public OnlineOrderService(OrderRepository orderRepository,
                              DeliveryRepository deliveryRepository,
                              OrderSupportService orderSupport) {
        this.orderRepository = orderRepository;
        this.deliveryRepository = deliveryRepository;
        this.orderSupport = orderSupport;
    }

    /**
     * Khách đặt đơn online.
     */
    @Transactional
    public OnlineOrderView placeOrder(OnlineOrderRequest req) {
        if (req.items() == null || req.items().isEmpty()) {
            throw ApiException.badRequest("Giỏ hàng đang trống, chưa chọn món nào.");
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
     * Lấy chi tiết đơn hàng online theo ID để theo dõi trạng thái (Tracking).
     */
    @Transactional(readOnly = true)
    public OnlineOrderView getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng #" + id));

        if (!Order.SOURCE_ONLINE.equalsIgnoreCase(order.getSource())) {
            throw ApiException.notFound("Không tìm thấy đơn hàng online #" + id);
        }

        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId()).orElse(null);
        String paymentMethod = Order.PENDING.equals(order.getStatus()) ? "PAYOS_QR" : "CASH";
        return toView(order, delivery, paymentMethod, null);
    }

    /**
     * Khách hàng tự hủy đơn hàng online.
     * Chỉ cho phép hủy khi đơn còn ở trạng thái chờ (chưa pha chế / chưa giao hàng).
     */
    @Transactional
    public OnlineOrderView cancelOrder(Long id, String reason) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng #" + id));

        if (!Order.SOURCE_ONLINE.equalsIgnoreCase(order.getSource())) {
            throw ApiException.notFound("Không tìm thấy đơn hàng online #" + id);
        }

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
        List<Order> orders = orderRepository.findByFulfillmentTypeOrderByCreatedAtDesc(Order.DELIVERY);
        return orders.stream().map(o -> {
            Delivery d = deliveryRepository.findByOrder_Id(o.getId()).orElse(null);
            String pm = o.getPayment() != null ? o.getPayment().getPaymentMethod() : (Order.PENDING.equals(o.getStatus()) ? "PAYOS_QR" : "CASH");
            return toView(o, d, pm, null);
        }).toList();
    }

    /**
     * Thu ngân xác nhận đơn giao hàng -> chuyển sang CONFIRMED để Pha chế nhận làm.
     */
    @Transactional
    public OnlineOrderView confirmDeliveryOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng #" + id));
        order.setStatus(Order.CONFIRMED);
        orderRepository.save(order);

        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId()).orElse(null);
        String pm = order.getPayment() != null ? order.getPayment().getPaymentMethod() : "CASH";
        return toView(order, delivery, pm, null);
    }

    /**
     * Thu ngân hủy đơn giao hàng (ví dụ: hết nguyên liệu, không giao được).
     */
    @Transactional
    public OnlineOrderView cashierCancelDeliveryOrder(Long id, String reason) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng #" + id));

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
