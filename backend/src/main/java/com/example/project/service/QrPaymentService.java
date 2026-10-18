package com.example.project.service;

import com.example.project.dto.cashier.QrEventsView;
import com.example.project.dto.cashier.QrPaymentView;
import com.example.project.dto.cashier.QrSessionRequest;
import com.example.project.dto.cashier.QrTakeawayCart;
import com.example.project.dto.cashier.QrTakeawayRequest;
import com.example.project.dto.onlinepay.OnlineQrRequest;
import com.example.project.dto.onlinepay.OnlineQrView;
import com.example.project.dto.onlinepay.QrOnlineCart;
import com.example.project.dto.order.OrderItemRequest;
import com.example.project.entity.CafeTable;
import com.example.project.entity.Customer;
import com.example.project.entity.Delivery;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import com.example.project.entity.QrPaymentRequest;
import com.example.project.entity.TableSession;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.payos.PayosClient;
import com.example.project.payos.PayosException;
import com.example.project.repository.CustomerRepository;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.QrPaymentRequestRepository;
import com.example.project.repository.TableSessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Thanh toán QR tự xác nhận qua payOS (BF-03): thu ngân tạo mã, khách quét bằng app ngân hàng, payOS báo
 * đã nhận tiền (webhook hoặc backend tự hỏi, xem QrPaymentWatcher) -> hệ thống tự ghi hóa đơn, thu ngân
 * KHÔNG phải bấm xác nhận.
 *
 * Quy tắc:
 * - Mã tồn tại theo cài đặt payment.qr_timeout_minutes (Admin chỉnh, 1..60 phút).
 * - Đóng hộp thanh toán không hủy mã: khách trả lúc nào hệ thống cũng tự xác nhận. Muốn thu cách khác phải hủy mã.
 * - Đơn tại bàn đang nằm trong mã chờ thì không sửa / hủy được và không nằm trong mã thứ 2.
 * - Mang đi: CHƯA tạo đơn lúc tạo mã (giỏ hàng lưu kèm mã), khách trả xong mới tạo đơn và gửi pha chế.
 * - Điểm khách dùng được tính lúc tạo mã (số tiền trong mã là số sau giảm) và bị giữ đến khi mã xong;
 *   chỉ trừ / cộng điểm thật khi tiền đã về.
 * - Hóa đơn ghi phương thức BANK_TRANSFER, thu ngân = người tạo mã; chi tiết payOS ở bảng qr_payment_requests.
 *
 * Hàm có gọi payOS bên trong transaction chỉ là lúc tạo mã (để khóa đơn trong lúc tạo). Các việc khác
 * (hủy, hỏi trạng thái, webhook) do QrPaymentWatcher gọi payOS ở ngoài rồi mới vào đây ghi DB.
 */
@Service
public class QrPaymentService {

    private static final Logger log = LoggerFactory.getLogger(QrPaymentService.class);
    private static final List<String> NOTIFY = List.of(QrPaymentRequest.PAID, QrPaymentRequest.MISMATCH);

    private final QrPaymentRequestRepository qrRepository;
    private final TableSessionRepository sessionRepository;
    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final CustomerRepository customerRepository;
    private final MenuItemRepository menuItemRepository;
    private final CashierService cashier;
    private final OrderSupportService support;
    private final SystemSettingService settings;
    private final PayosClient payos;
    private final ObjectMapper objectMapper;
    private final OnlineLoyaltyService onlineLoyalty;
    private final DeliveryRepository deliveryRepository;

    public QrPaymentService(QrPaymentRequestRepository qrRepository, TableSessionRepository sessionRepository,
                            OrderRepository orderRepository, OrderLockRepository lockRepository,
                            CustomerRepository customerRepository, MenuItemRepository menuItemRepository,
                            CashierService cashier, OrderSupportService support, SystemSettingService settings,
                            PayosClient payos, ObjectMapper objectMapper, OnlineLoyaltyService onlineLoyalty,
                            DeliveryRepository deliveryRepository) {
        this.qrRepository = qrRepository;
        this.sessionRepository = sessionRepository;
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.customerRepository = customerRepository;
        this.menuItemRepository = menuItemRepository;
        this.cashier = cashier;
        this.support = support;
        this.settings = settings;
        this.payos = payos;
        this.objectMapper = objectMapper;
        this.onlineLoyalty = onlineLoyalty;
        this.deliveryRepository = deliveryRepository;
    }

    /** Thông tin tối thiểu của 1 mã để QrPaymentWatcher làm việc với payOS ngoài transaction. */
    public record Snapshot(Long id, long orderCode, long amount, LocalDateTime expiresAt, String status) {}

    // ===== Tạo mã =====

    /** Tạo mã QR cho các đơn chưa thanh toán của 1 bàn (orderIds bỏ trống = mọi đơn chưa thanh toán). */
    @Transactional
    public QrPaymentView createForSession(Long sessionId, QrSessionRequest req, User createdBy) {
        requireGateway();
        TableSession s = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lượt khách id = " + sessionId));
        if (!s.isActive()) throw ApiException.badRequest("Lượt khách này đã xong, bàn đã trả về trống.");

        // Khóa các đơn của bàn: thu tiền mặt / tạo mã khác / sửa đơn cùng lúc phải chờ.
        List<Order> sessionOrders = lockRepository.findWithLockByTableSession_IdOrderByCreatedAtAsc(sessionId);
        List<Order> toPay = CashierService.pickOrdersToPay(sessionOrders, req.orderIds());
        cashier.ensureNoPendingQr(toPay);
        long subtotal = toPay.stream().mapToLong(Order::activeTotal).sum();
        if (req.expectedSubtotal() != null && req.expectedSubtotal() != subtotal) {
            throw ApiException.conflict("Đơn vừa thay đổi, số tiền cần thu bây giờ là " + money(subtotal)
                    + ". Vui lòng đóng hộp thanh toán và kiểm tra lại hóa đơn.");
        }

        Customer customer = findCustomerOrNull(req.customerId());
        int redeem = req.pointsToRedeem() == null ? 0 : req.pointsToRedeem();
        long discount = cashier.pointsDiscount(subtotal, customer, redeem, null);

        QrPaymentRequest r = newRequest(QrPaymentRequest.TABLE, subtotal, discount, customer, redeem, createdBy);
        r.setTableSession(s);
        r.getOrders().addAll(toPay);
        return open(r);
    }

    /** Tạo mã QR cho đơn mang đi. Đơn chưa được tạo: giỏ hàng (đã tính giá) lưu kèm mã. */
    @Transactional
    public QrPaymentView createForTakeaway(QrTakeawayRequest req, User createdBy) {
        requireGateway();
        if (req.items() == null || req.items().isEmpty()) throw ApiException.badRequest("Chưa chọn món nào.");
        List<QrTakeawayCart.Line> lines = new ArrayList<>();
        long subtotal = 0;
        for (OrderItemRequest i : req.items()) {
            OrderItem built = support.buildItem(i); // kiểm tra món còn bán + lấy giá hiện tại
            lines.add(QrTakeawayCart.Line.of(built));
            subtotal += built.getSubtotal();
        }
        Customer customer = findCustomerOrNull(req.customerId());
        int redeem = req.pointsToRedeem() == null ? 0 : req.pointsToRedeem();
        long discount = cashier.pointsDiscount(subtotal, customer, redeem, null);

        QrPaymentRequest r = newRequest(QrPaymentRequest.TAKEAWAY, subtotal, discount, customer, redeem, createdBy);
        r.setCartJson(writeCart(new QrTakeawayCart(OrderSupportService.blankToNull(req.note()), lines)));
        return open(r);
    }

    /** "Tạo mã mới" khi mã cũ đã hết hạn / bị hủy: cùng các đơn (hoặc cùng giỏ hàng), cùng khách và số điểm. */
    @Transactional
    public QrPaymentView renew(Long id, User createdBy) {
        QrPaymentRequest old = find(id);
        if (old.isPending()) return toView(old);
        if (QrPaymentRequest.PAID.equals(old.getStatus()) || QrPaymentRequest.MISMATCH.equals(old.getStatus())) {
            throw ApiException.badRequest("Mã QR này đã nhận tiền, không tạo lại được.");
        }
        if (old.isOnline()) {
            // D5-A: mã của khách đặt online hết hạn thì khách đặt lại trên web, không tạo mã mới.
            throw ApiException.badRequest("Mã QR của khách đặt online không tạo lại được, khách cần đặt lại trên web.");
        }
        Long customerId = old.getCustomer() == null ? null : old.getCustomer().getId();
        if (old.isTable()) {
            List<Long> orderIds = old.getOrders().stream().map(Order::getId).toList();
            return createForSession(old.getTableSession().getId(),
                    new QrSessionRequest(customerId, old.getPointsToRedeem(), orderIds, old.getSubtotal()), createdBy);
        }
        requireGateway();
        QrTakeawayCart cart = readCart(old.getCartJson());
        long subtotal = cart.lines().stream().mapToLong(QrTakeawayCart.Line::subtotal).sum();
        long discount = cashier.pointsDiscount(subtotal, old.getCustomer(), old.getPointsToRedeem(), null);
        QrPaymentRequest r = newRequest(QrPaymentRequest.TAKEAWAY, subtotal, discount, old.getCustomer(),
                old.getPointsToRedeem(), createdBy);
        r.setCartJson(old.getCartJson());
        return open(r);
    }

    // ===== Khách đặt online (ThangNN Iter2, BF-03-2) =====

    /**
     * Khách đặt online chọn trả QR: tính giá ở server, xác định khách thân thiết, trừ điểm, tạo mã payOS.
     * Đơn CHƯA được tạo (giống mang đi): giỏ hàng + thông tin giao hàng lưu kèm mã, khách trả xong mới tạo đơn.
     * Thành viên mới (nếu có) được tạo trong cùng transaction: payOS lỗi thì không lưu gì cả.
     * Trả về paymentLinkId (chuỗi ngẫu nhiên do payOS cấp) để trang của khách hỏi trạng thái mã.
     */
    @Transactional
    public String createForOnline(OnlineQrRequest req) {
        if (!payos.isConfigured()) {
            throw ApiException.badRequest("Quán chưa bật thanh toán QR, vui lòng thử lại sau.");
        }
        String name = OrderSupportService.blankToNull(req.customerName());
        String address = OrderSupportService.blankToNull(req.deliveryAddress());
        if (name == null || address == null) throw ApiException.badRequest("Vui lòng nhập họ tên và địa chỉ giao hàng.");
        if (req.items() == null || req.items().isEmpty()) throw ApiException.badRequest("Giỏ hàng đang trống.");
        String phone = OnlineLoyaltyService.normalizePhone(req.customerPhone());

        List<QrTakeawayCart.Line> lines = new ArrayList<>();
        long subtotal = 0;
        for (OrderItemRequest i : req.items()) {
            OrderItem built = support.buildItem(i); // kiểm tra món còn bán + lấy giá hiện tại ở server
            lines.add(QrTakeawayCart.Line.of(built));
            subtotal += built.getSubtotal();
        }

        Customer customer = onlineLoyalty.resolveCustomer(phone, name, Boolean.TRUE.equals(req.joinLoyalty()));
        int redeem = req.pointsToRedeem() == null ? 0 : req.pointsToRedeem();
        if (redeem > 0 && customer == null) {
            throw ApiException.badRequest("Số điện thoại này chưa là thành viên nên chưa có điểm để dùng.");
        }
        long discount = cashier.pointsDiscount(subtotal, customer, redeem, null);
        if (discount > 0 && discount >= subtotal) {
            throw ApiException.badRequest("Điểm dùng không được trừ hết tiền đơn (số tiền trong mã QR phải lớn hơn 0đ). "
                    + "Vui lòng dùng ít điểm hơn.");
        }

        QrPaymentRequest r = newRequest(QrPaymentRequest.ONLINE, subtotal, discount, customer, redeem, null);
        r.setCartJson(writeOnlineCart(new QrOnlineCart(name, phone, address,
                OrderSupportService.blankToNull(req.note()), lines)));
        open(r);
        if (r.getPaymentLinkId() == null || r.getPaymentLinkId().isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "payOS không trả về mã link thanh toán, vui lòng thử lại.");
        }
        return r.getPaymentLinkId();
    }

    private QrPaymentRequest newRequest(String target, long subtotal, long discount, Customer customer, int redeem,
                                        User createdBy) {
        long amount = subtotal - discount;
        if (amount <= 0) {
            throw ApiException.badRequest("Số tiền cần thu là 0đ nên không cần mã QR. Chọn Tiền mặt để xác nhận.");
        }
        QrPaymentRequest r = new QrPaymentRequest();
        r.setTargetType(target);
        r.setSubtotal(subtotal);
        r.setAmount(amount);
        r.setCustomer(customer);
        r.setPointsToRedeem(redeem);
        r.setCreatedBy(createdBy);
        r.setOrderCode(nextOrderCode());
        r.setDescription(descriptionOf(r.getOrderCode()));
        r.setExpiresAt(LocalDateTime.now().plusMinutes(settings.qrTimeoutMinutes()).truncatedTo(ChronoUnit.SECONDS));
        return r;
    }

    /** Gọi payOS tạo link rồi mới lưu. payOS lỗi -> báo lỗi, transaction rollback, không lưu gì. */
    private QrPaymentView open(QrPaymentRequest r) {
        long expiredAt = r.getExpiresAt().atZone(ZoneId.systemDefault()).toEpochSecond();
        PayosClient.CreatedLink link;
        try {
            link = r.isOnline()
                    ? payos.createOnlineLink(r.getOrderCode(), r.getAmount(), r.getDescription(), expiredAt)
                    : payos.createLink(r.getOrderCode(), r.getAmount(), r.getDescription(), expiredAt);
        } catch (PayosException e) {
            log.warn("Không tạo được link payOS (orderCode {}): [{}] {}", r.getOrderCode(), e.getCode(), e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Không tạo được mã QR: " + e.getMessage());
        }
        r.setPaymentLinkId(link.paymentLinkId());
        r.setQrCode(link.qrCode());
        r.setCheckoutUrl(link.checkoutUrl());
        qrRepository.save(r);
        return toView(r);
    }

    /**
     * Mã đơn gửi payOS: phải duy nhất trên payOS, kể cả khi cả nhóm dùng chung 1 kênh thanh toán với DB riêng
     * từng máy, nên không dùng id tự tăng mà dùng thời gian (giây) x 1000 + số ngẫu nhiên.
     */
    private long nextOrderCode() {
        for (int i = 0; i < 5; i++) {
            long code = Instant.now().getEpochSecond() * 1000 + ThreadLocalRandom.current().nextInt(1000);
            if (!qrRepository.existsByOrderCode(code)) return code;
        }
        throw ApiException.conflict("Không sinh được mã thanh toán, vui lòng thử lại.");
    }

    /** Nội dung chuyển khoản tối đa 9 ký tự (payOS giới hạn với tài khoản không liên kết qua payOS): "GC" + 7 số. */
    static String descriptionOf(long orderCode) {
        return "GC" + String.format("%07d", orderCode % 10_000_000L);
    }

    // ===== Xem =====

    @Transactional(readOnly = true)
    public QrPaymentView view(Long id) {
        return toView(find(id));
    }

    /**
     * Trang của khách đặt online hỏi trạng thái mã (mỗi 3 giây). Chỉ trả mã ONLINE; mã của thu ngân coi như không có.
     * Việc biết khách đã trả vẫn do QrPaymentWatcher (webhook + hỏi payOS định kỳ) làm, hàm này chỉ đọc DB.
     */
    @Transactional(readOnly = true)
    public OnlineQrView viewOnline(String paymentLinkId) {
        QrPaymentRequest r = paymentLinkId == null || paymentLinkId.isBlank() ? null
                : qrRepository.findByPaymentLinkId(paymentLinkId.trim()).orElse(null);
        if (r == null || !r.isOnline()) throw new ResourceNotFoundException("Không tìm thấy mã thanh toán.");
        QrOnlineCart cart = readOnlineCart(r.getCartJson());
        Payment p = r.getPayment();
        Order o = p == null ? null : p.getOrder();
        long secondsLeft = r.isPending()
                ? Math.max(0, Duration.between(LocalDateTime.now(), r.getExpiresAt()).getSeconds()) : 0;
        return new OnlineQrView(r.getPaymentLinkId(), r.getStatus(),
                r.getSubtotal(), r.getSubtotal() - r.getAmount(), r.getAmount(), r.getPointsToRedeem(),
                r.getQrCode(), r.getCheckoutUrl(), r.getDescription(),
                r.getExpiresAt(), secondsLeft, cart.itemCount(), cart.customerPhone(),
                o == null ? null : OrderSupportService.displayNumber(o.getOrderNumber()), r.getPaidAt());
    }

    /**
     * Mã đang chờ khách quét: của 1 bàn (sessionId), theo loại (target = TABLE / TAKEAWAY) hoặc tất cả.
     * Không trả mã ONLINE: mã do khách đặt online tự tạo, thu ngân không hủy / tạo lại (Q2-A).
     */
    @Transactional(readOnly = true)
    public List<QrPaymentView> pending(Long sessionId, String target) {
        List<QrPaymentRequest> list;
        if (sessionId != null) {
            list = qrRepository.findByStatusAndTableSession_IdOrderByCreatedAtAsc(QrPaymentRequest.PENDING, sessionId);
        } else if (target != null && !target.isBlank()) {
            list = qrRepository.findByStatusAndTargetTypeOrderByCreatedAtAsc(QrPaymentRequest.PENDING,
                    target.trim().toUpperCase());
        } else {
            list = qrRepository.findByStatusOrderByCreatedAtAsc(QrPaymentRequest.PENDING);
        }
        return list.stream().filter(r -> !r.isOnline()).map(this::toView).toList();
    }

    /**
     * Mã vừa thanh toán xong / vừa nhận tiền mà không ghi được, kể từ "since" (lùi 10 giây cho chắc,
     * frontend tự bỏ thông báo trùng). since = null: chỉ trả mốc thời gian để lần sau hỏi tiếp.
     */
    @Transactional(readOnly = true)
    public QrEventsView events(LocalDateTime since) {
        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.MILLIS);
        if (since == null) return new QrEventsView(now, List.of());
        List<QrPaymentView> events = qrRepository
                .findByStatusInAndStatusChangedAtAfterOrderByStatusChangedAtAsc(NOTIFY, since.minusSeconds(10))
                .stream().map(this::toView).toList();
        return new QrEventsView(now, events);
    }

    // ===== Dùng cho QrPaymentWatcher =====

    @Transactional(readOnly = true)
    public Snapshot snapshot(Long id) {
        return snap(find(id));
    }

    @Transactional(readOnly = true)
    public Optional<Snapshot> snapshotByOrderCode(long orderCode) {
        return qrRepository.findByOrderCode(orderCode).map(QrPaymentService::snap);
    }

    @Transactional(readOnly = true)
    public List<Snapshot> pendingSnapshots() {
        return qrRepository.findByStatusOrderByCreatedAtAsc(QrPaymentRequest.PENDING).stream()
                .map(QrPaymentService::snap).toList();
    }

    /**
     * payOS báo đã nhận đủ tiền -> ghi hóa đơn (PAID), trừ / cộng điểm, đánh dấu đơn đã thanh toán, trả bàn nếu xong;
     * mang đi thì tạo đơn và gửi pha chế. Webhook và lần hỏi định kỳ cùng về thì chỉ ghi 1 lần (khóa dòng).
     * Nhận cả mã đã hết hạn / đã hủy (tiền về muộn): đơn vẫn y nguyên thì vẫn ghi nhận, không thì MISMATCH
     * để thu ngân kiểm tra và xử lý tay.
     */
    @Transactional
    public QrPaymentView applyPaid(Long id, String via, String reference) {
        QrPaymentRequest r = qrRepository.findWithLockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã QR id = " + id));
        if (QrPaymentRequest.PAID.equals(r.getStatus()) || QrPaymentRequest.MISMATCH.equals(r.getStatus())) {
            return toView(r);
        }
        r.setPaidAt(LocalDateTime.now());
        r.setBankReference(reference);
        r.setConfirmedVia(via);
        String problem = r.isTable() ? settleTable(r) : r.isOnline() ? settleOnline(r) : settleTakeaway(r);
        if (problem == null) {
            r.moveTo(QrPaymentRequest.PAID, null);
            log.info("Mã QR {} (orderCode {}) đã thanh toán {}đ, xác nhận qua {}.", r.getId(), r.getOrderCode(),
                    r.getAmount(), via);
        } else {
            r.moveTo(QrPaymentRequest.MISMATCH, "Tiền đã về nhưng chưa ghi được vào hóa đơn: " + problem);
            log.warn("Mã QR {} (orderCode {}) đã nhận tiền nhưng không ghi được: {}", r.getId(), r.getOrderCode(), problem);
        }
        qrRepository.save(r);
        return toView(r);
    }

    /** Đóng mã đang chờ: CANCELLED (thu ngân hủy) / EXPIRED (hết giờ). Mã đã xong thì giữ nguyên. */
    @Transactional
    public QrPaymentView markClosed(Long id, String status, String reason) {
        QrPaymentRequest r = qrRepository.findWithLockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã QR id = " + id));
        if (r.isPending()) {
            r.moveTo(status, reason);
            qrRepository.save(r);
        }
        return toView(r);
    }

    /** Hết giờ mà khách mới chuyển 1 phần tiền: không ghi hóa đơn, báo thu ngân xử lý tay. */
    @Transactional
    public QrPaymentView markMismatch(Long id, String reason) {
        QrPaymentRequest r = qrRepository.findWithLockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã QR id = " + id));
        if (r.isPending()) {
            r.setPaidAt(LocalDateTime.now());
            r.moveTo(QrPaymentRequest.MISMATCH, reason);
            qrRepository.save(r);
            log.warn("Mã QR {} (orderCode {}): {}", r.getId(), r.getOrderCode(), reason);
        }
        return toView(r);
    }

    // ===== Ghi hóa đơn khi tiền đã về =====

    /** Trả về null nếu ghi được, ngược lại là lý do (khi đó KHÔNG ghi gì). */
    private String settleTable(QrPaymentRequest r) {
        TableSession s = r.getTableSession();
        // Khóa đơn của bàn TRƯỚC khi đọc danh sách đơn trong mã, để thấy trạng thái mới nhất.
        List<Order> locked = lockRepository.findWithLockByTableSession_IdOrderByCreatedAtAsc(s.getId());
        if (!s.isActive()) return "lượt khách của bàn đã đóng.";
        Map<Long, Order> byId = locked.stream().collect(Collectors.toMap(Order::getId, Function.identity()));
        List<Order> toPay = new ArrayList<>();
        for (Order target : r.getOrders()) {
            Order o = byId.get(target.getId());
            if (o == null) return num(target) + " không còn thuộc bàn này.";
            if (o.isCancelled()) return num(o) + " đã bị hủy.";
            if (o.isPaid()) return num(o) + " đã được thanh toán cách khác.";
            toPay.add(o);
        }
        long subtotal = toPay.stream().mapToLong(Order::activeTotal).sum();
        if (subtotal != r.getSubtotal()) {
            return "tiền các đơn đã đổi (" + money(subtotal) + ", trong mã QR là " + money(r.getSubtotal()) + ").";
        }
        boolean inOtherQr = qrRepository.findPendingContaining(toPay.stream().map(Order::getId).toList()).stream()
                .anyMatch(other -> !other.getId().equals(r.getId()));
        if (inOtherQr) return "các đơn đang nằm trong một mã QR khác đang chờ thanh toán.";
        String pointsProblem = pointsProblem(r);
        if (pointsProblem != null) return pointsProblem;

        Payment p = new Payment();
        p.setTableSession(s);
        cashier.record(p, r.getSubtotal(), r.getSubtotal() - r.getAmount(), r.getPointsToRedeem(),
                Payment.BANK_TRANSFER, r.getCustomer(), r.getCreatedBy(), s);
        toPay.forEach(o -> o.markPaid(p));
        orderRepository.saveAll(toPay);
        if (r.getCustomer() != null) s.setCustomer(r.getCustomer());
        support.closeSessionIfSettled(s); // mọi đơn đã phục vụ + đã thanh toán -> trả bàn
        sessionRepository.save(s);
        r.setPayment(p);
        return null;
    }

    /** Mang đi: tạo đơn từ giỏ hàng đã lưu (đúng giá lúc tạo mã), ghi hóa đơn, đơn vào hàng chờ pha. */
    private String settleTakeaway(QrPaymentRequest r) {
        QrTakeawayCart cart = readCart(r.getCartJson());
        String pointsProblem = pointsProblem(r);
        if (pointsProblem != null) return pointsProblem;

        Customer customer = r.getCustomer();
        Order o = new Order();
        o.setOrderNumber(support.nextOrderNumber());
        o.setSource(Order.SOURCE_STAFF);
        o.setFulfillmentType(Order.PICKUP);
        o.setStatus(Order.PENDING);
        o.setCreatedBy(r.getCreatedBy());
        o.setCustomerNote(cart.note());
        if (customer != null) {
            o.setCustomer(customer);
            o.setCustomerName(customer.getFullName());
            o.setCustomerPhone(customer.getPhoneNumber());
        }
        for (QrTakeawayCart.Line line : cart.lines()) {
            MenuItem item = menuItemRepository.findById(line.menuItemId()).orElse(null);
            if (item == null) return "món \"" + line.itemName() + "\" không còn trong thực đơn.";
            o.addItem(line.toOrderItem(item));
        }
        o.recalcTotal();
        if (o.getTotalAmount() == null || o.getTotalAmount() != r.getSubtotal()) {
            return "tiền giỏ hàng không khớp số tiền trong mã QR.";
        }
        orderRepository.save(o);

        Payment p = new Payment();
        p.setOrder(o);
        cashier.record(p, r.getSubtotal(), r.getSubtotal() - r.getAmount(), r.getPointsToRedeem(),
                Payment.BANK_TRANSFER, customer, r.getCreatedBy(), null);
        o.markPaid(p); // trả trước: đơn vào hàng chờ pha với trạng thái Đã thanh toán
        orderRepository.save(o);
        r.setPayment(p);
        return null;
    }

    /**
     * Khách đặt online: tạo đơn ONLINE / DELIVERY từ giỏ đã lưu (đúng giá lúc tạo mã), ghi hóa đơn, trừ / cộng điểm,
     * tạo dòng giao hàng. Đơn vào thẳng CONFIRMED để pha chế làm ngay (D7-A). Hóa đơn không có thu ngân xác nhận
     * (confirmed_by = NULL) vì do payOS báo về.
     */
    private String settleOnline(QrPaymentRequest r) {
        QrOnlineCart cart = readOnlineCart(r.getCartJson());
        String pointsProblem = pointsProblem(r);
        if (pointsProblem != null) return pointsProblem;

        Customer customer = r.getCustomer();
        Order o = new Order();
        o.setOrderNumber(support.nextOrderNumber());
        o.setSource(Order.SOURCE_ONLINE);
        o.setFulfillmentType(Order.DELIVERY);
        o.setStatus(Order.CONFIRMED);
        o.setCustomerName(cart.customerName());
        o.setCustomerPhone(cart.customerPhone());
        o.setCustomerNote(cart.note());
        o.setCustomer(customer);
        for (QrTakeawayCart.Line line : cart.lines()) {
            MenuItem item = menuItemRepository.findById(line.menuItemId()).orElse(null);
            if (item == null) return "món \"" + line.itemName() + "\" không còn trong thực đơn.";
            o.addItem(line.toOrderItem(item));
        }
        o.recalcTotal();
        if (o.getTotalAmount() == null || o.getTotalAmount() != r.getSubtotal()) {
            return "tiền giỏ hàng không khớp số tiền trong mã QR.";
        }
        orderRepository.save(o);

        Payment p = new Payment();
        p.setOrder(o);
        cashier.record(p, r.getSubtotal(), r.getSubtotal() - r.getAmount(), r.getPointsToRedeem(),
                Payment.BANK_TRANSFER, customer, null, null);
        o.markPaid(p);
        orderRepository.save(o);
        deliveryRepository.save(new Delivery(o, cart.deliveryAddress()));
        r.setPayment(p);
        return null;
    }

    /** Điểm đã giữ lúc tạo mã: khách phải còn đủ điểm (DB không cho điểm âm). */
    private static String pointsProblem(QrPaymentRequest r) {
        int redeem = r.getPointsToRedeem();
        if (redeem <= 0) return null;
        Customer c = r.getCustomer();
        if (c == null) return "mã QR có dùng điểm nhưng không có khách thân thiết.";
        if (c.getCurrentPoints() < redeem) {
            return "khách " + c.getPhoneNumber() + " không còn đủ " + redeem + " điểm đã dùng khi tạo mã.";
        }
        return null;
    }

    // ===== Dùng chung =====

    private void requireGateway() {
        if (!payos.isConfigured()) {
            throw ApiException.badRequest("Chưa cấu hình payOS nên chưa dùng được thanh toán QR tự xác nhận. "
                    + "Chọn Tiền mặt hoặc Chuyển khoản thủ công.");
        }
    }

    private QrPaymentRequest find(Long id) {
        return qrRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã QR id = " + id));
    }

    private Customer findCustomerOrNull(Long customerId) {
        if (customerId == null) return null;
        return customerRepository.findById(customerId)
                .orElseThrow(() -> ApiException.badRequest("Không tìm thấy khách thân thiết id = " + customerId));
    }

    private String writeCart(QrTakeawayCart cart) {
        try {
            return objectMapper.writeValueAsString(cart);
        } catch (Exception e) {
            throw ApiException.badRequest("Không lưu được giỏ hàng.");
        }
    }

    private QrTakeawayCart readCart(String json) {
        try {
            QrTakeawayCart cart = objectMapper.readValue(json, QrTakeawayCart.class);
            if (cart.lines() == null || cart.lines().isEmpty()) throw new IllegalStateException("giỏ hàng rỗng");
            return cart;
        } catch (Exception e) {
            throw new IllegalStateException("Không đọc được giỏ hàng của mã QR: " + e.getMessage(), e);
        }
    }

    private String writeOnlineCart(QrOnlineCart cart) {
        try {
            return objectMapper.writeValueAsString(cart);
        } catch (Exception e) {
            throw ApiException.badRequest("Không lưu được giỏ hàng.");
        }
    }

    /** Đọc giỏ hàng + thông tin giao hàng của mã ONLINE. */
    private QrOnlineCart readOnlineCart(String json) {
        try {
            QrOnlineCart cart = objectMapper.readValue(json, QrOnlineCart.class);
            if (cart.lines() == null || cart.lines().isEmpty()) throw new IllegalStateException("giỏ hàng rỗng");
            return cart;
        } catch (Exception e) {
            throw new IllegalStateException("Không đọc được giỏ hàng online của mã QR: " + e.getMessage(), e);
        }
    }

    private static Snapshot snap(QrPaymentRequest r) {
        return new Snapshot(r.getId(), r.getOrderCode(), r.getAmount(), r.getExpiresAt(), r.getStatus());
    }

    private QrPaymentView toView(QrPaymentRequest r) {
        TableSession s = r.getTableSession();
        CafeTable t = s == null ? null : s.getTable();
        Payment p = r.getPayment();
        Order takeawayOrder = p == null ? null : p.getOrder();
        List<Order> orders = r.isTable() ? r.getOrders() : List.of();
        int itemCount = r.isTable() ? 0 : cartItemCount(r.getCartJson());
        long secondsLeft = r.isPending()
                ? Math.max(0, Duration.between(LocalDateTime.now(), r.getExpiresAt()).getSeconds()) : 0;
        Customer c = r.getCustomer();
        User creator = r.getCreatedBy();
        return new QrPaymentView(r.getId(), r.getStatus(), r.getTargetType(), r.getOrderCode(),
                r.getSubtotal(), r.getSubtotal() - r.getAmount(), r.getAmount(), r.getPointsToRedeem(),
                r.getQrCode(), r.getCheckoutUrl(), r.getDescription(),
                r.getCreatedAt(), r.getExpiresAt(), secondsLeft,
                s == null ? null : s.getId(), t == null ? null : t.getId(), t == null ? null : t.getTableNumber(),
                orders.stream().map(Order::getId).toList(),
                orders.stream().map(QrPaymentService::num).collect(Collectors.joining(", ")),
                itemCount,
                c == null ? null : (c.getFullName() != null ? c.getFullName() : c.getPhoneNumber()),
                creator == null ? null : creator.getFullName(),
                r.getPaidAt(), p == null ? null : p.getId(), p == null ? null : p.getPaymentCode(),
                takeawayOrder == null ? null : takeawayOrder.getOrderNumber(),
                s != null && QrPaymentRequest.PAID.equals(r.getStatus()) && !s.isActive(),
                r.getNote(), r.getStatusChangedAt());
    }

    private int cartItemCount(String json) {
        if (json == null) return 0;
        try {
            return objectMapper.readValue(json, QrTakeawayCart.class).itemCount();
        } catch (Exception e) {
            return 0;
        }
    }

    private static String num(Order o) {
        return OrderSupportService.displayNumber(o.getOrderNumber());
    }

    private static String money(long v) {
        return String.format("%,d", v).replace(',', '.') + "đ";
    }
}
