package com.example.project.service;

import com.example.project.dto.delivery.WaiterOptionView;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Giao hàng đơn online (Iter 3): thu ngân xem chi tiết đơn, chọn phục vụ và gán đi giao;
 * phục vụ được gán bấm qua từng bước giao: nhận hàng đi giao, đã giao, giao không thành công.
 */
@Service
public class DeliveryService {

    public static final String WAITER_ROLE = "WAITER";

    /** Đơn đã xác nhận mới gán được (đang chờ pha, đang pha hoặc đã pha xong). */
    static final List<String> ASSIGNABLE_ORDER = List.of(Order.CONFIRMED, Order.PREPARING, Order.READY);
    /** Phục vụ chưa lấy hàng thì còn đổi người được. */
    static final List<String> REASSIGNABLE_DELIVERY = List.of(Delivery.STATUS_PENDING_ASSIGNMENT, Delivery.STATUS_ASSIGNED);
    /** Đơn phục vụ đang cầm: đã gán, đã lấy hàng hoặc đang giao. */
    public static final List<String> HOLDING = List.of(
            Delivery.STATUS_ASSIGNED, Delivery.STATUS_PICKED_UP, Delivery.STATUS_OUT_FOR_DELIVERY);

    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final OnlineOrderService onlineOrderService;

    public DeliveryService(OrderRepository orderRepository, OrderLockRepository lockRepository,
                           DeliveryRepository deliveryRepository, UserRepository userRepository,
                           OnlineOrderService onlineOrderService) {
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.deliveryRepository = deliveryRepository;
        this.userRepository = userRepository;
        this.onlineOrderService = onlineOrderService;
    }

    /** Chi tiết 1 đơn giao hàng cho thu ngân (thông tin khách đầy đủ, không che). */
    @Transactional(readOnly = true)
    public OnlineOrderView getDeliveryOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .filter(o -> Order.DELIVERY.equals(o.getFulfillmentType()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn giao hàng #" + orderId));
        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId()).orElse(null);
        return onlineOrderService.toView(order, delivery, paymentMethod(order), null);
    }

    /** Phục vụ đang hoạt động để thu ngân chọn người giao, ai ít đơn đang cầm hơn xếp trước. */
    @Transactional(readOnly = true)
    public List<WaiterOptionView> listWaiters() {
        return userRepository.findAllByStatusOrderByFullNameAsc(User.ACTIVE).stream()
                .filter(u -> u.getRole() != null && WAITER_ROLE.equals(u.getRole().getName()))
                .map(u -> new WaiterOptionView(u.getId(), u.getFullName(), holdingCount(u.getId())))
                .sorted(Comparator.comparingLong(WaiterOptionView::holdingCount))
                .toList();
    }

    /**
     * Thu ngân gán (hoặc đổi) phục vụ đi giao 1 đơn.
     * Khóa dòng đơn trước khi đọc: 2 thu ngân gán cùng lúc, hoặc gán đúng lúc phục vụ lấy hàng,
     * thì người sau đọc lại trạng thái mới và nhận lỗi 409 nếu không còn hợp lệ.
     */
    @Transactional
    public OnlineOrderView assign(Long orderId, Long waiterId) {
        if (waiterId == null) throw ApiException.badRequest("Chọn phục vụ đi giao.");
        Order order = lockedDeliveryOrder(orderId);
        String no = OrderSupportService.displayNumber(order.getOrderNumber());

        if (!ASSIGNABLE_ORDER.contains(order.getStatus())) {
            String why = Order.PENDING.equals(order.getStatus()) ? "chưa được xác nhận"
                    : order.isCancelled() ? "đã bị hủy" : "đã kết thúc";
            throw ApiException.conflict("Không gán được: đơn " + no + " " + why + ".");
        }
        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId())
                .orElseThrow(() -> ApiException.notFound("Đơn " + no + " chưa có thông tin giao hàng."));
        if (!REASSIGNABLE_DELIVERY.contains(delivery.getDeliveryStatus())) {
            throw ApiException.conflict("Không đổi người được: phục vụ đã lấy hàng đơn " + no + ".");
        }

        User waiter = userRepository.findById(waiterId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy nhân viên #" + waiterId));
        if (waiter.getRole() == null || !WAITER_ROLE.equals(waiter.getRole().getName())) {
            throw ApiException.badRequest(waiter.getFullName() + " không phải phục vụ, không gán đi giao được.");
        }
        if (!User.ACTIVE.equals(waiter.getStatus())) {
            throw ApiException.badRequest("Tài khoản của " + waiter.getFullName() + " đang bị khóa.");
        }

        User current = delivery.getAssignedWaiter();
        if (current == null || !waiterId.equals(current.getId())) { // gán lại đúng người cũ thì giữ nguyên giờ gán
            delivery.setAssignedWaiter(waiter);
            delivery.setAssignedAt(LocalDateTime.now());
            delivery.setDeliveryStatus(Delivery.STATUS_ASSIGNED);
            deliveryRepository.save(delivery);
        }

        return onlineOrderService.toView(order, delivery, paymentMethod(order), null);
    }

    /**
     * Phục vụ bấm "Đã lấy hàng": chỉ đúng người được gán, món đã pha xong (READY) và chưa lấy trước đó.
     * Ghi giờ lấy hàng, chuyển sang Đang giao (OUT_FOR_DELIVERY). Từ đây thu ngân không đổi người được nữa.
     */
    @Transactional
    public OnlineOrderView pickUp(Long orderId, Long waiterId) {
        Order order = lockedDeliveryOrder(orderId);
        String no = OrderSupportService.displayNumber(order.getOrderNumber());
        Delivery delivery = myDelivery(order, waiterId, no);

        if (!Delivery.STATUS_ASSIGNED.equals(delivery.getDeliveryStatus())) {
            throw ApiException.conflict("Đơn " + no + " đã được lấy hàng rồi.");
        }
        if (!Order.READY.equals(order.getStatus())) {
            throw ApiException.conflict("Đơn " + no + " chưa pha xong, chưa lấy hàng được.");
        }
        delivery.setPickedUpAt(LocalDateTime.now());
        delivery.setDeliveryStatus(Delivery.STATUS_OUT_FOR_DELIVERY);
        deliveryRepository.save(delivery);
        return onlineOrderService.toView(order, delivery, paymentMethod(order), null);
    }

    /**
     * Phục vụ bấm "Đã giao": chỉ đúng người được gán, đơn đang giao.
     * Chỉ đổi trạng thái giao hàng.
     * Đơn chuyển sang Hoàn thành để không còn nằm ở "Pha xong".
     */
    @Transactional
    public OnlineOrderView deliver(Long orderId, Long waiterId) {
        Order order = lockedDeliveryOrder(orderId);
        String no = OrderSupportService.displayNumber(order.getOrderNumber());
        Delivery delivery = myDelivery(order, waiterId, no);

        if (!Delivery.STATUS_OUT_FOR_DELIVERY.equals(delivery.getDeliveryStatus())) {
            throw ApiException.conflict(Delivery.STATUS_DELIVERED.equals(delivery.getDeliveryStatus())
                    ? "Đơn " + no + " đã giao xong rồi."
                    : "Đơn " + no + " chưa lấy hàng, chưa giao xong được.");
        }

        LocalDateTime now = LocalDateTime.now();
        delivery.setDeliveredAt(now);
        delivery.setDeliveryStatus(Delivery.STATUS_DELIVERED);
        deliveryRepository.save(delivery);
        order.moveTo(Order.SERVED, OrderItem.SERVED);
        order.setCompletedAt(now);
        orderRepository.save(order);
        return onlineOrderService.toView(order, delivery, paymentMethod(order), null);
    }

    /**
     * Phục vụ bấm "Giao không thành công" (khách không nghe máy, sai địa chỉ...): chỉ đúng người được gán, đơn đang giao.
     * Bắt buộc ghi lý do. Đơn chuyển sang Đã hủy, lý do hủy = "Giao không thành công: <lý do>".
     * Không xử lý tiền (hoàn tiền QR nếu có là việc của phần thanh toán).
     */
    @Transactional
    public OnlineOrderView fail(Long orderId, Long waiterId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw ApiException.badRequest("Vui lòng nhập lý do giao không thành công.");
        }
        if (reason.trim().length() > 400) {
            throw ApiException.badRequest("Lý do tối đa 400 ký tự.");
        }
        Order order = lockedDeliveryOrder(orderId);
        String no = OrderSupportService.displayNumber(order.getOrderNumber());
        Delivery delivery = myDelivery(order, waiterId, no);

        if (!Delivery.STATUS_OUT_FOR_DELIVERY.equals(delivery.getDeliveryStatus())) {
            throw ApiException.conflict("Đơn " + no + " không còn đang giao, không báo giao lỗi được.");
        }

        String why = reason.trim();
        LocalDateTime now = LocalDateTime.now();
        delivery.setFailedAt(now);
        delivery.setFailureReason(why);
        delivery.setDeliveryStatus(Delivery.STATUS_FAILED);
        deliveryRepository.save(delivery);
        order.moveTo(Order.CANCELLED, OrderItem.CANCELLED);
        order.setCancelReason("Giao không thành công: " + why);
        order.setCancelledAt(now);
        orderRepository.save(order);
        return onlineOrderService.toView(order, delivery, paymentMethod(order), null);
    }

    /** Đơn giao hàng kèm khóa dòng: thao tác cùng lúc trên 1 đơn (thu ngân đổi người / phục vụ bấm) phải chờ nhau. */
    private Order lockedDeliveryOrder(Long orderId) {
        return lockRepository.findWithLockById(orderId)
                .filter(o -> Order.DELIVERY.equals(o.getFulfillmentType()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn giao hàng #" + orderId));
    }

    /** Dòng giao hàng của đơn, chỉ khi người đang đăng nhập đúng là phục vụ được gán. */
    private Delivery myDelivery(Order order, Long waiterId, String no) {
        Delivery delivery = deliveryRepository.findByOrder_Id(order.getId())
                .orElseThrow(() -> ApiException.notFound("Đơn " + no + " chưa có thông tin giao hàng."));
        User assigned = delivery.getAssignedWaiter();
        if (assigned == null || !assigned.getId().equals(waiterId)) {
            throw ApiException.forbidden("Đơn " + no + " không được gán cho bạn.");
        }
        return delivery;
    }

    private static String paymentMethod(Order order) {
        return order.getPayment() != null ? order.getPayment().getPaymentMethod() : "CASH";
    }

    /** Đơn phục vụ đang cầm (đã gán, đang giao), gán trước hiện trước. */
    @Transactional(readOnly = true)
    public List<OnlineOrderView> myDeliveries(Long waiterId) {
        return deliveryRepository.findByAssignedWaiter_IdAndDeliveryStatusInOrderByAssignedAtAsc(waiterId, HOLDING)
                .stream()
                .map(d -> onlineOrderService.toView(d.getOrder(), d, paymentMethod(d.getOrder()), null))
                .toList();
    }

    /** Số đơn phục vụ đang cầm (đã gán, đã lấy hàng, đang giao). */
    @Transactional(readOnly = true)
    public long holdingCount(Long waiterId) {
        return deliveryRepository.countByAssignedWaiter_IdAndDeliveryStatusIn(waiterId, HOLDING);
    }
}
