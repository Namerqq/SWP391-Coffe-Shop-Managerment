package com.example.project.service;

import com.example.project.dto.delivery.WaiterOptionView;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.entity.Delivery;
import com.example.project.entity.Order;
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
 * Giao hàng đơn online (Iter 3): thu ngân xem chi tiết đơn, chọn phục vụ và gán đi giao.
 * Các bước lấy hàng / giao xong / giao lỗi của phục vụ sẽ thêm ở commit sau.
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
        Order order = lockRepository.findWithLockById(orderId)
                .filter(o -> Order.DELIVERY.equals(o.getFulfillmentType()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn giao hàng #" + orderId));
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

    private static String paymentMethod(Order order) {
        return order.getPayment() != null ? order.getPayment().getPaymentMethod() : "CASH";
    }

    /** Số đơn phục vụ đang cầm (đã gán, đã lấy hàng, đang giao). */
    @Transactional(readOnly = true)
    public long holdingCount(Long waiterId) {
        return deliveryRepository.countByAssignedWaiter_IdAndDeliveryStatusIn(waiterId, HOLDING);
    }
}
