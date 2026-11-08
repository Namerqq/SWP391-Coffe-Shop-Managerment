package com.example.project.service;

import com.example.project.entity.Delivery;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import com.example.project.entity.TableSession;
import com.example.project.entity.User;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.PaymentRepository;
import com.example.project.repository.QrPaymentRequestRepository;
import com.example.project.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Xử lý đơn còn dở khi hết ngày (EndOfDayOrderJob gọi cho từng đơn), xét theo TỪNG MÓN:
 * - Đơn chưa thu tiền: hủy món chờ pha; hủy món đã pha chưa mang ra và ghi biên bản sự cố cho quản lý.
 *   Món đã mang ra giữ nguyên, thu ngân vẫn thu được tiền các món đó.
 * - Đơn giao hàng đã trả QR, chưa lấy hàng đi giao: hủy như trên, đơn tự vào danh sách cần hoàn tiền của thu ngân.
 * - Đơn tại quầy đã thu tiền: không tự hủy, vì món đã hủy thì thu ngân không chọn để hoàn tiền được nữa.
 *   Khách đã nhận thì phục vụ tích đã mang ra; chưa nhận thì thu ngân hoàn tiền.
 * - Đơn đang đi giao: không đụng tới, phục vụ báo giao xong hoặc giao lỗi.
 * - Đơn đang chờ quét QR: bỏ qua lần này, lần chạy sau xử lý khi mã đã đóng.
 */
@Service
public class EndOfDayOrderService {

    private static final Logger log = LoggerFactory.getLogger(EndOfDayOrderService.class);

    public static final List<String> OPEN_STATUSES =
            List.of(Order.PENDING, Order.CONFIRMED, Order.PREPARING, Order.READY);
    public static final String CANCEL_REASON = "Hết ngày, đơn chưa hoàn thành";
    static final String INCIDENT_REASON = "Tự động cuối ngày: món đã pha xong nhưng đến 0h chưa mang ra.";
    private static final String REPORTER_ROLE = "ADMIN";

    private final OrderLockRepository lockRepository;
    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final PaymentRepository paymentRepository;
    private final QrPaymentRequestRepository qrRepository;
    private final UserRepository userRepository;
    private final IncidentReportService incidentService;
    private final OrderSupportService support;

    public EndOfDayOrderService(OrderLockRepository lockRepository, OrderRepository orderRepository,
                                DeliveryRepository deliveryRepository, PaymentRepository paymentRepository,
                                QrPaymentRequestRepository qrRepository, UserRepository userRepository,
                                IncidentReportService incidentService, OrderSupportService support) {
        this.lockRepository = lockRepository;
        this.orderRepository = orderRepository;
        this.deliveryRepository = deliveryRepository;
        this.paymentRepository = paymentRepository;
        this.qrRepository = qrRepository;
        this.userRepository = userRepository;
        this.incidentService = incidentService;
        this.support = support;
    }

    /**
     * Xử lý 1 đơn tạo trước mốc cutoff. Mỗi đơn 1 transaction: ghi biên bản lỗi thì món của đơn đó không bị hủy.
     * Trả về true nếu có món vừa bị hủy.
     */
    @Transactional
    public boolean closeOverdueOrder(Long orderId, LocalDateTime cutoff) {
        Order o = lockRepository.findWithLockById(orderId).orElse(null);
        // Đọc lại sau khi có khóa: trong lúc chờ khóa đơn có thể đã được xử lý.
        if (o == null || !OPEN_STATUSES.contains(o.getStatus()) || !o.getCreatedAt().isBefore(cutoff)) return false;

        Delivery delivery = Order.DELIVERY.equals(o.getFulfillmentType())
                ? deliveryRepository.findByOrder_Id(o.getId()).orElse(null) : null;
        if (mustWaitForStaff(o, delivery) || qrRepository.countPendingContaining(o.getId()) > 0) return false;

        List<OrderItem> made = o.getItems().stream()
                .filter(i -> OrderItem.READY.equals(i.getItemStatus())).toList();
        List<OrderItem> waiting = o.getItems().stream().filter(OrderItem::isWaitingForPreparation).toList();
        if (made.isEmpty() && waiting.isEmpty()) return false;

        User reporter = null;
        if (!made.isEmpty()) {
            reporter = userRepository.findFirstByRole_NameAndStatusOrderByIdAsc(REPORTER_ROLE, User.ACTIVE).orElse(null);
            if (reporter == null) {
                log.warn("Đơn {} chưa được hủy cuối ngày: không có tài khoản Admin để ghi biên bản sự cố.", o.getOrderNumber());
                return false;
            }
        }

        waiting.forEach(i -> i.setItemStatus(OrderItem.CANCELLED));
        made.forEach(i -> i.setItemStatus(OrderItem.CANCELLED));
        o.recalcTotal();
        o.syncStatusFromItems();
        if (o.isCancelled()) o.setCancelReason(CANCEL_REASON);
        orderRepository.saveAndFlush(o);

        if (delivery != null && o.isCancelled()) {
            delivery.setDeliveryStatus(Delivery.STATUS_CANCELLED);
            deliveryRepository.save(delivery);
        }
        for (OrderItem line : made) {
            incidentService.create(line, reporter, IncidentReport.CANCEL, INCIDENT_REASON);
        }

        TableSession session = o.getTableSession();
        support.closeSessionIfEmpty(session);
        support.closeSessionIfSettled(session);
        return true;
    }

    /** Đơn liên quan đến tiền đã thu hoặc đang đi giao thì cần người xử lý, job không tự hủy. */
    private boolean mustWaitForStaff(Order o, Delivery delivery) {
        if (delivery != null && !RefundService.CANCELLABLE_DELIVERY.contains(delivery.getDeliveryStatus())) return true;
        boolean paid = o.isPaid() || paymentRepository.existsByOrder_IdAndPaymentStatus(o.getId(), Payment.PAID);
        boolean refundListed = Order.DELIVERY.equals(o.getFulfillmentType()) && o.isPaid();
        return paid && !refundListed;
    }
}
