package com.example.project.service;

import com.example.project.dto.online.OnlineOrderRequest;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // 3. Xử lý trạng thái theo phương thức thanh toán
        boolean isQr = "PAYOS_QR".equalsIgnoreCase(req.paymentMethodOrDefault());
        if (isQr) {
            // QR: Chờ thanh toán payOS -> PENDING_CONFIRMATION (chưa hiện cho Barista)
            order.setStatus(Order.PENDING);
            order.setPaymentStatus(Order.UNPAID);
        } else {
            // COD: Tiền mặt khi nhận hàng -> CONFIRMED (gửi ngay cho Barista pha chế)
            order.setStatus(Order.CONFIRMED);
            order.setPaymentStatus(Order.UNPAID);
        }

        Order savedOrder = orderRepository.save(order);

        // 4. Tạo bản ghi giao hàng (Delivery) trong bảng deliveries có sẵn
        Delivery delivery = new Delivery();
        delivery.setOrder(savedOrder);
        delivery.setDeliveryAddress(req.deliveryAddress().trim());
        delivery.setDeliveryStatus(Delivery.STATUS_PENDING_ASSIGNMENT);
        Delivery savedDelivery = deliveryRepository.save(delivery);

        return toView(savedOrder, savedDelivery, isQr ? "PAYOS_QR" : "CASH", null);
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
