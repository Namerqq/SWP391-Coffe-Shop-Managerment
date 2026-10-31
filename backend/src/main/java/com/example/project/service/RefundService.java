package com.example.project.service;

import com.example.project.dto.refund.OrderToRefundView;
import com.example.project.dto.refund.RefundCompleteRequest;
import com.example.project.dto.refund.RefundItemsRequest;
import com.example.project.dto.refund.RefundPreview;
import com.example.project.dto.refund.RefundPreviewRequest;
import com.example.project.dto.refund.RefundReportView;
import com.example.project.dto.refund.RefundView;
import com.example.project.entity.Customer;
import com.example.project.entity.Delivery;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.LoyaltyTransaction;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import com.example.project.entity.TableSession;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CustomerRepository;
import com.example.project.repository.DeliveryRepository;
import com.example.project.repository.LoyaltyTransactionRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.PaymentRepository;
import com.example.project.repository.RefundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Hoàn tiền (ThangNN Iter3, Template 6 "Refund and Loyalty Reversal").
 *
 * Không thêm bảng: mỗi lần hoàn là 1 dòng payments "chiều ngược lại", gắn order_id của đơn được hoàn,
 * total_amount = số tiền trả khách, payment_status = REFUND_PENDING (chờ chuyển khoản trả khách) hoặc
 * REFUNDED (đã trả xong), note = món được hoàn + lý do (+ mã giao dịch chuyển khoản). Dòng hóa đơn gốc giữ nguyên PAID;
 * hóa đơn gốc của 1 dòng hoàn = order.payment. Mã phiếu hoàn dạng RFyyMMdd-0001.
 *
 * 1. Đơn tại quầy (tại bàn / mang đi) đã thu tiền: thu ngân chọn các món CHƯA MANG RA để hoàn (cùng quy tắc
 *    với "Bỏ món khi thanh toán": món đã pha xong thì ghi thêm biên bản sự cố cho quản lý).
 *    Tiền hoàn chia theo tỉ lệ khách thực trả (hóa đơn có dùng điểm thì mỗi món được giảm tương ứng).
 *    Tiền mặt: trả ngay, phiếu REFUNDED. Chuyển khoản: phiếu REFUND_PENDING tới khi nhập mã giao dịch.
 * 2. Đơn online đã trả QR: "Hủy và hoàn tiền" khi phục vụ chưa lấy hàng đi giao, hoặc tạo phiếu hoàn cho đơn
 *    đã bị hủy (giao không thành công). Luôn hoàn cả đơn, bằng chuyển khoản (REFUND_PENDING).
 * 3. Điểm khách thân thiết: trừ lại phần điểm đã cộng ứng với số tiền hoàn; hoàn hết hóa đơn thì trả lại
 *    điểm khách đã dùng. Ghi loyalty_transactions type REFUND gắn HÓA ĐƠN GỐC. Không trừ quá số dư hiện có.
 * Doanh thu và tiền đã thu trong ngày trừ tiền đã hoàn (REFUNDED) theo giờ trả khách (paid_at của dòng hoàn).
 * Quản lý hậu kiểm bằng danh sách chỉ xem (report).
 */
@Service
public class RefundService {

    public static final List<String> REFUND_STATUSES = List.of(Payment.REFUND_PENDING, Payment.REFUNDED);
    /** Phục vụ chưa lấy hàng đi giao thì thu ngân còn hủy được đơn online. */
    static final List<String> CANCELLABLE_DELIVERY = List.of(Delivery.STATUS_PENDING_ASSIGNMENT, Delivery.STATUS_ASSIGNED);
    static final String INCIDENT_PREFIX = "Thu ngân hoàn tiền món đã pha xong nhưng chưa mang ra. Lý do: ";
    private static final int NOTE_MAX = 500;
    private static final int INCIDENT_REASON_MAX = 300;
    private static final int REASON_MAX = 200;
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyMMdd");

    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final DeliveryRepository deliveryRepository;
    private final LoyaltyTransactionRepository loyaltyRepository;
    private final CustomerRepository customerRepository;
    private final IncidentReportService incidentService;
    private final OrderSupportService support;

    public RefundService(RefundRepository refundRepository, PaymentRepository paymentRepository,
                         OrderRepository orderRepository, OrderLockRepository lockRepository,
                         DeliveryRepository deliveryRepository, LoyaltyTransactionRepository loyaltyRepository,
                         CustomerRepository customerRepository, IncidentReportService incidentService,
                         OrderSupportService support) {
        this.refundRepository = refundRepository;
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.deliveryRepository = deliveryRepository;
        this.loyaltyRepository = loyaltyRepository;
        this.customerRepository = customerRepository;
        this.incidentService = incidentService;
        this.support = support;
    }

    /**
     * Kết quả tính trước khi hoàn, dùng chung cho xem trước và hoàn thật.
     * gross = giá các món được hoàn, refundable = hóa đơn gốc còn hoàn được, amount = tiền trả khách,
     * activeAfter = giá các món còn lại của hóa đơn sau lần hoàn này (0 = hoàn hết),
     * pointsTakeBack = điểm cần trừ lại, pointsTakeBackActual = điểm trừ được (không quá số dư), pointsReturn = điểm trả lại.
     */
    record Plan(long gross, long refundable, long amount, long activeAfter, Customer customer,
                int pointsTakeBack, int pointsTakeBackActual, int pointsReturn) {}

    // ===== 1. Đơn tại quầy: hoàn tiền các món chưa mang ra =====

    /** Xem trước số tiền / điểm khi hoàn các món đang chọn (chưa ghi gì). */
    @Transactional(readOnly = true)
    public RefundPreview preview(RefundPreviewRequest req) {
        if (req == null || req.orderId() == null) throw ApiException.badRequest("Thiếu đơn cần hoàn tiền.");
        Order o = orderRepository.findById(req.orderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + req.orderId()));
        Payment original = requireCounterOrderPaid(o);
        List<OrderItem> lines = pickItems(o, req.itemIds());
        Plan plan = plan(original, orderRepository.findByPayment_IdOrderByCreatedAtAsc(original.getId()), gross(lines));
        return new RefundPreview(plan.gross(), plan.refundable(), plan.amount(), plan.activeAfter() == 0,
                plan.pointsTakeBackActual(), plan.pointsReturn(), customerName(plan.customer()),
                original.getPaymentMethod(), nz(original.getTotalAmount()),
                lines.stream().anyMatch(i -> OrderItem.READY.equals(i.getItemStatus())));
    }

    /**
     * Hoàn tiền các món chưa mang ra của 1 đơn tại bàn / mang đi đã thanh toán.
     * Khóa mọi đơn của bàn (hoặc đơn mang đi) trước khi đọc: 2 thu ngân hoàn cùng 1 hóa đơn thì người sau
     * thấy số tiền còn hoàn được mới nhất, không hoàn quá số khách đã trả.
     */
    @Transactional
    public RefundView refundItems(Long orderId, RefundItemsRequest req, User cashier) {
        if (req == null) throw ApiException.badRequest("Thiếu thông tin hoàn tiền.");
        String reason = requireReason(req.reason());
        String method = requireMethod(req.method());
        Order o = lockOrderForRefund(orderId);
        Payment original = requireCounterOrderPaid(o);
        List<OrderItem> lines = pickItems(o, req.itemIds());

        Plan plan = plan(original, orderRepository.findByPayment_IdOrderByCreatedAtAsc(original.getId()), gross(lines));
        if (req.expectedAmount() != null && req.expectedAmount() != plan.amount()) {
            throw ApiException.conflict("Số tiền hoàn vừa thay đổi thành " + money(plan.amount())
                    + ". Vui lòng xem lại trước khi hoàn.");
        }

        List<OrderItem> made = lines.stream().filter(i -> OrderItem.READY.equals(i.getItemStatus())).toList();
        String itemsText = itemsText(lines);
        lines.forEach(i -> i.setItemStatus(OrderItem.CANCELLED));
        o.recalcTotal();
        o.syncStatusFromItems();
        if (o.isCancelled()) o.setCancelReason("Hoàn tiền: " + reason);
        orderRepository.saveAndFlush(o);

        // Món đã pha xong thì đã trừ kho: ghi biên bản để quản lý xem (màn Sự cố, người báo = thu ngân).
        for (OrderItem line : made) {
            incidentService.create(line, cashier, IncidentReport.CANCEL, limit(INCIDENT_PREFIX + reason, INCIDENT_REASON_MAX));
        }

        Payment refund = newRefund(o, plan.amount(), method, cashier,
                "Món: " + itemsText + ". Lý do: " + reason + "." + pointsText(plan));
        applyLoyalty(original, plan, refund.getPaymentCode());

        TableSession s = o.getTableSession();
        support.closeSessionIfEmpty(s);   // bàn không còn đơn hợp lệ nào -> trả bàn trống
        support.closeSessionIfSettled(s); // các đơn còn lại đều đã phục vụ + đã thanh toán -> đóng lượt
        return toView(refund);
    }

    // ===== 2. Đơn online đã trả QR =====

    /**
     * Thu ngân hủy đơn online đã trả QR khi phục vụ chưa lấy hàng đi giao (hết nguyên liệu, khách gọi hủy...),
     * đồng thời tạo phiếu hoàn chuyển khoản cả đơn (chờ thu ngân chuyển trả và nhập mã giao dịch).
     */
    @Transactional
    public RefundView cancelDeliveryAndRefund(Long orderId, String reason, User cashier) {
        String why = requireReason(reason);
        Order o = lockedDeliveryOrder(orderId);
        String num = num(o);
        if (o.isCancelled()) {
            throw ApiException.conflict("Đơn " + num + " đã bị hủy trước đó. Nếu khách chưa được hoàn tiền, "
                    + "tạo phiếu hoàn ở nút Hoàn tiền của Lịch sử đơn.");
        }
        if (!o.isPaid() || o.getPayment() == null) {
            throw ApiException.badRequest("Đơn " + num + " chưa thanh toán (trả khi nhận hàng) nên không cần hoàn tiền. "
                    + "Dùng nút Hủy đơn bình thường.");
        }
        if (o.isServed()) throw ApiException.conflict("Đơn " + num + " đã giao xong, không hủy được.");
        Delivery delivery = deliveryRepository.findByOrder_Id(o.getId()).orElse(null);
        if (delivery != null && !CANCELLABLE_DELIVERY.contains(delivery.getDeliveryStatus())) {
            throw ApiException.conflict("Phục vụ đã lấy hàng đi giao đơn " + num + " nên không hủy được nữa. "
                    + "Nếu giao không thành công, phục vụ báo giao lỗi rồi tạo phiếu hoàn ở nút Hoàn tiền của Lịch sử đơn.");
        }

        Payment original = o.getPayment();
        Plan plan = plan(original, List.of(o), o.activeTotal());
        String itemsText = itemsText(o.getItems().stream().filter(i -> !i.isCancelled()).toList());
        o.moveTo(Order.CANCELLED, OrderItem.CANCELLED);
        o.setCancelReason(why);
        o.setCancelledAt(LocalDateTime.now());
        orderRepository.save(o);
        if (delivery != null) {
            delivery.setDeliveryStatus(Delivery.STATUS_CANCELLED);
            deliveryRepository.save(delivery);
        }

        Payment refund = newRefund(o, plan.amount(), Payment.BANK_TRANSFER, cashier,
                "Hủy cả đơn: " + itemsText + ". Lý do: " + why + "." + pointsText(plan));
        applyLoyalty(original, plan, refund.getPaymentCode());
        return toView(refund);
    }

    /**
     * Tạo phiếu hoàn chuyển khoản cho đơn online đã trả QR nhưng ĐÃ bị hủy (thường là giao không thành công).
     * Thu ngân quyết định có hoàn hay không (lỗi do khách thì tùy chính sách quán). reason bỏ trống = lý do hủy đơn.
     */
    @Transactional
    public RefundView refundCancelledDelivery(Long orderId, String reason, User cashier) {
        Order o = lockedDeliveryOrder(orderId);
        String num = num(o);
        if (!o.isCancelled()) {
            throw ApiException.conflict("Đơn " + num + " chưa bị hủy. Dùng nút Hủy & hoàn tiền ở màn Đơn giao hàng.");
        }
        if (!o.isPaid() || o.getPayment() == null) {
            throw ApiException.badRequest("Đơn " + num + " chưa thanh toán nên không cần hoàn tiền.");
        }
        Payment original = o.getPayment();
        Plan plan = plan(original, List.of(o), o.activeTotal());
        if (plan.refundable() <= 0) throw ApiException.conflict("Đơn " + num + " đã được hoàn tiền rồi.");

        String why = OrderSupportService.blankToNull(reason);
        if (why == null) why = o.getCancelReason() == null ? "Đơn đã hủy" : o.getCancelReason();
        why = limit(why, 300);
        Payment refund = newRefund(o, plan.amount(), Payment.BANK_TRANSFER, cashier,
                "Hủy cả đơn: " + itemsText(o.getItems()) + ". Lý do: " + why + "." + pointsText(plan));
        applyLoyalty(original, plan, refund.getPaymentCode());
        return toView(refund);
    }

    // ===== 3. Chờ chuyển khoản -> đã trả =====

    /** Thu ngân đã chuyển khoản trả khách: nhập mã giao dịch, phiếu chuyển sang Đã hoàn (tính vào trừ doanh thu lúc này). */
    @Transactional
    public RefundView complete(Long refundId, RefundCompleteRequest req, User cashier) {
        String ref = req == null ? null : OrderSupportService.blankToNull(req.bankReference());
        if (ref == null) throw ApiException.badRequest("Nhập mã giao dịch chuyển khoản trả khách.");
        if (ref.length() > 100) throw ApiException.badRequest("Mã giao dịch tối đa 100 ký tự.");
        Payment r = refundRepository.findRefundWithLockById(refundId)
                .filter(Payment::isRefund)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu hoàn id = " + refundId));
        if (Payment.REFUNDED.equals(r.getPaymentStatus())) {
            throw ApiException.conflict("Phiếu " + r.getPaymentCode() + " đã hoàn xong trước đó. Danh sách vừa được tải lại.");
        }
        r.setPaymentStatus(Payment.REFUNDED);
        r.setPaidAt(LocalDateTime.now());
        r.setNote(joinNote(r.getNote(), "Mã GD hoàn: " + ref + " (" + staffName(cashier) + " xác nhận)."));
        paymentRepository.save(r);
        return toView(r);
    }

    // ===== Danh sách =====

    /** Phiếu chờ chuyển khoản trả khách, chờ lâu nhất trước. */
    @Transactional(readOnly = true)
    public List<RefundView> pending() {
        return refundRepository.findByPaymentStatusOrderByCreatedAtAsc(Payment.REFUND_PENDING).stream()
                .map(this::toView).toList();
    }

    /** Đơn online đã trả QR, đã bị hủy, chưa có phiếu hoàn. */
    @Transactional(readOnly = true)
    public List<OrderToRefundView> ordersToRefund() {
        return refundRepository.findCancelledPaidDeliveryWithoutRefund().stream().map(o -> {
            Payment p = o.getPayment();
            Delivery d = deliveryRepository.findByOrder_Id(o.getId()).orElse(null);
            return new OrderToRefundView(o.getId(), o.getOrderNumber(), num(o), o.getCustomerName(), o.getCustomerPhone(),
                    o.getCancelReason(), o.getCancelledAt(),
                    d == null ? null : d.getDeliveryStatus(), d == null ? null : d.getFailureReason(),
                    p.getId(), p.getPaymentCode(), nz(p.getTotalAmount()), paymentReference(p));
        }).toList();
    }

    /** Phiếu hoàn tạo trong 1 ngày (bỏ trống = hôm nay), mới nhất trước. */
    @Transactional(readOnly = true)
    public List<RefundView> listByDay(LocalDate date) {
        LocalDate day = date == null ? LocalDate.now() : date;
        if (day.isAfter(LocalDate.now())) throw ApiException.badRequest("Không xem được ngày trong tương lai.");
        return refundRepository.findRefundsCreatedBetween(REFUND_STATUSES, day.atStartOfDay(), day.plusDays(1).atStartOfDay())
                .stream().map(this::toView).toList();
    }

    /** Quản lý hậu kiểm: phiếu hoàn tạo trong [from, to] (bỏ trống = 7 ngày gần nhất). Chỉ xem. */
    @Transactional(readOnly = true)
    public RefundReportView report(LocalDate from, LocalDate to) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(6) : from;
        if (start.isAfter(end)) throw ApiException.badRequest("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
        if (start.plusYears(1).isBefore(end)) throw ApiException.badRequest("Chỉ xem tối đa 1 năm mỗi lần.");
        List<RefundView> rows = refundRepository
                .findRefundsCreatedBetween(REFUND_STATUSES, start.atStartOfDay(), end.plusDays(1).atStartOfDay())
                .stream().map(this::toView).toList();
        long refunded = rows.stream().filter(r -> Payment.REFUNDED.equals(r.status())).mapToLong(RefundView::amount).sum();
        long pending = rows.stream().filter(r -> Payment.REFUND_PENDING.equals(r.status())).mapToLong(RefundView::amount).sum();
        return new RefundReportView(start, end, rows.size(), refunded, pending, rows);
    }

    /** Các phiếu hoàn của 1 hóa đơn gốc (để in trên hóa đơn). */
    @Transactional(readOnly = true)
    public List<RefundView> refundsOf(Long paymentId) {
        return refundRepository.findRefundsOf(paymentId).stream().map(this::toView).toList();
    }

    // ===== Tính tiền / điểm =====

    /**
     * Tiền trả khách cho các món trị giá gross: chia theo tỉ lệ (số tiền còn hoàn được / giá các món còn hiệu lực),
     * làm tròn đến đồng. Hoàn hết các món còn lại (gross >= activeNow) thì trả hết số còn lại, nên cộng các lần hoàn
     * không bao giờ lệch so với số khách đã trả.
     */
    static long refundAmount(long refundable, long gross, long activeNow) {
        if (refundable <= 0 || (gross <= 0 && activeNow > 0)) return 0;
        if (gross >= activeNow) return refundable;
        return (refundable * gross * 2 + activeNow) / (2 * activeNow);
    }

    /**
     * Điểm đã cộng cần trừ lại: khách giữ phần điểm ứng với số tiền vẫn trả sau lần hoàn này
     * (earned x paidAfter / total, làm tròn xuống), trừ đi phần đã trừ ở các lần hoàn trước.
     */
    static int pointsToTakeBack(int earned, int alreadyTakenBack, long total, long paidAfter) {
        if (earned <= 0) return 0;
        long keep = total <= 0 ? 0 : earned * Math.max(0, paidAfter) / total;
        return (int) Math.max(0, earned - alreadyTakenBack - keep);
    }

    private Plan plan(Payment original, List<Order> paidOrders, long gross) {
        long activeNow = paidOrders.stream().mapToLong(Order::activeTotal).sum();
        long total = nz(original.getTotalAmount());
        long refundable = Math.max(0, total - nz(refundRepository.sumRefundsOf(original.getId())));
        long amount = refundAmount(refundable, gross, activeNow);
        long activeAfter = Math.max(0, activeNow - gross);

        Customer customer = null;
        int earned = 0;
        int redeemed = 0;
        int takenBack = 0;
        int returned = 0;
        for (LoyaltyTransaction t : loyaltyRepository.findByPayment_Id(original.getId())) {
            customer = t.getCustomer();
            int change = t.getPointsChange() == null ? 0 : t.getPointsChange();
            String type = t.getTransactionType();
            if (LoyaltyTransaction.EARN.equals(type)) earned += change;
            else if (LoyaltyTransaction.REDEEM.equals(type)) redeemed -= change;
            else if (LoyaltyTransaction.REFUND.equals(type)) {
                if (change < 0) takenBack -= change;
                else returned += change;
            }
        }
        if (customer == null) return new Plan(gross, refundable, amount, activeAfter, null, 0, 0, 0);

        int takeBack = pointsToTakeBack(earned, takenBack, total, refundable - amount);
        int giveBack = activeAfter == 0 ? Math.max(0, redeemed - returned) : 0;
        int balance = customer.getCurrentPoints() == null ? 0 : customer.getCurrentPoints();
        int actualTake = Math.min(takeBack, balance + giveBack);
        return new Plan(gross, refundable, amount, activeAfter, customer, takeBack, actualTake, giveBack);
    }

    /** Ghi điểm trả lại / trừ lại (type REFUND, gắn hóa đơn gốc) và cập nhật số dư của khách. */
    private void applyLoyalty(Payment original, Plan plan, String refundCode) {
        Customer c = plan.customer();
        if (c == null || (plan.pointsReturn() == 0 && plan.pointsTakeBackActual() == 0)) return;
        int points = c.getCurrentPoints() == null ? 0 : c.getCurrentPoints();
        TableSession s = original.getTableSession();
        if (plan.pointsReturn() > 0) {
            loyaltyRepository.save(LoyaltyTransaction.of(c, original, s, plan.pointsReturn(), LoyaltyTransaction.REFUND,
                    "Hoàn tiền " + refundCode + ": trả lại " + plan.pointsReturn() + " điểm đã dùng"));
            points += plan.pointsReturn();
        }
        if (plan.pointsTakeBackActual() > 0) {
            String note = "Hoàn tiền " + refundCode + ": trừ " + plan.pointsTakeBackActual() + " điểm đã cộng";
            if (plan.pointsTakeBackActual() < plan.pointsTakeBack()) {
                note += " (cần trừ " + plan.pointsTakeBack() + " nhưng khách chỉ còn đủ " + plan.pointsTakeBackActual() + ")";
            }
            loyaltyRepository.save(LoyaltyTransaction.of(c, original, s, -plan.pointsTakeBackActual(),
                    LoyaltyTransaction.REFUND, note));
            points -= plan.pointsTakeBackActual();
        }
        c.setCurrentPoints(points);
        customerRepository.save(c);
    }

    private static String pointsText(Plan plan) {
        if (plan.customer() == null || (plan.pointsTakeBackActual() == 0 && plan.pointsReturn() == 0)) return "";
        List<String> parts = new ArrayList<>();
        if (plan.pointsTakeBackActual() > 0) parts.add("trừ " + plan.pointsTakeBackActual() + " điểm đã cộng");
        if (plan.pointsReturn() > 0) parts.add("trả lại " + plan.pointsReturn() + " điểm đã dùng");
        return " Điểm: " + String.join(", ", parts) + ".";
    }

    // ===== Dùng chung =====

    /** Đơn tại quầy đã thanh toán, chưa hủy -> hóa đơn gốc. */
    private Payment requireCounterOrderPaid(Order o) {
        String num = num(o);
        if (Order.DELIVERY.equals(o.getFulfillmentType())) {
            throw ApiException.badRequest("Đơn giao hàng online hoàn tiền ở màn Đơn giao hàng (nút Hủy & hoàn tiền) "
                    + "hoặc nút Hoàn tiền ở Lịch sử đơn.");
        }
        if (!o.isPaid() || o.getPayment() == null) {
            throw ApiException.badRequest("Đơn " + num + " chưa thanh toán nên không cần hoàn tiền. "
                    + "Bỏ món ở màn thanh toán của bàn.");
        }
        if (o.isCancelled()) throw ApiException.conflict("Đơn " + num + " đã hủy. Vui lòng tải lại.");
        Payment original = o.getPayment();
        if (!Payment.PAID.equals(original.getPaymentStatus())) {
            throw ApiException.conflict("Hóa đơn " + original.getPaymentCode() + " không ở trạng thái đã thu.");
        }
        return original;
    }

    /** Các món được chọn: thuộc đơn, chưa hủy / chưa hoàn, chưa mang ra cho khách. */
    private static List<OrderItem> pickItems(Order o, List<Long> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) throw ApiException.badRequest("Chọn ít nhất 1 món cần hoàn tiền.");
        List<OrderItem> picked = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(itemIds)) {
            OrderItem line = o.getItems().stream()
                    .filter(i -> i.getId() != null && i.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Món id = " + id + " không thuộc đơn này."));
            String name = line.getMenuItem().getName();
            if (line.isCancelled()) {
                throw ApiException.conflict("Món " + name + " đã được hủy / hoàn tiền trước đó. Vui lòng tải lại.");
            }
            if (OrderItem.SERVED.equals(line.getItemStatus())) {
                throw ApiException.badRequest("Món " + name + " đã mang ra cho khách, không hoàn tiền ở đây được.");
            }
            picked.add(line);
        }
        return picked;
    }

    /**
     * Khóa đơn trước khi hoàn. Đơn tại bàn: khóa mọi đơn của lượt khách (1 hóa đơn có thể gồm nhiều đơn),
     * đọc mã lượt khách bằng 1 câu riêng để đơn chưa nằm sẵn trong bộ nhớ (đọc kèm khóa luôn lấy bản mới nhất).
     */
    private Order lockOrderForRefund(Long orderId) {
        Long sessionId = refundRepository.findSessionIdOfOrder(orderId).orElse(null);
        if (sessionId != null) {
            return lockRepository.findWithLockByTableSession_IdOrderByCreatedAtAsc(sessionId).stream()
                    .filter(x -> x.getId().equals(orderId))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + orderId));
        }
        return lockRepository.findWithLockById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + orderId));
    }

    private Order lockedDeliveryOrder(Long orderId) {
        return lockRepository.findWithLockById(orderId)
                .filter(o -> Order.DELIVERY.equals(o.getFulfillmentType()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn giao hàng #" + orderId));
    }

    /** Dòng hoàn tiền mới. Tiền mặt: trả ngay (REFUNDED); chuyển khoản: chờ nhập mã giao dịch (REFUND_PENDING). */
    private Payment newRefund(Order o, long amount, String method, User cashier, String note) {
        Payment r = new Payment();
        r.setOrder(o);
        r.setPaymentCode(nextRefundCode());
        r.setPaymentMethod(method);
        r.setTotalAmount(amount);
        r.setPaymentStatus(Payment.CASH.equals(method) ? Payment.REFUNDED : Payment.REFUND_PENDING);
        // DB bắt buộc paid_at với 2 trạng thái hoàn: phiếu chờ ghi giờ tạo, lúc trả xong cập nhật lại.
        r.setPaidAt(LocalDateTime.now());
        r.setConfirmedBy(cashier);
        r.setNote(limit(note, NOTE_MAX));
        return paymentRepository.save(r);
    }

    /** Mã phiếu hoàn dạng RFyyMMdd-0001 (cùng cột payment_code với hóa đơn PM...). */
    private String nextRefundCode() {
        String prefix = "RF" + LocalDate.now().format(DAY) + "-";
        return prefix + String.format("%04d", paymentRepository.countByPaymentCodeStartingWith(prefix) + 1);
    }

    RefundView toView(Payment r) {
        Order o = r.getOrder();
        Payment original = o == null ? null : o.getPayment();
        TableSession s = o == null ? null : o.getTableSession();
        String place = s != null ? s.getTable().getTableNumber()
                : o != null && Order.DELIVERY.equals(o.getFulfillmentType()) ? "Giao hàng" : "Mang đi";
        return new RefundView(r.getId(), r.getPaymentCode(), r.getPaymentStatus(), r.getPaymentMethod(),
                nz(r.getTotalAmount()), r.getNote(), r.getCreatedAt(),
                Payment.REFUNDED.equals(r.getPaymentStatus()) ? r.getPaidAt() : null, staffName(r.getConfirmedBy()),
                o == null ? null : o.getId(), o == null ? null : o.getOrderNumber(), o == null ? null : num(o),
                o == null ? null : o.getFulfillmentType(), place,
                o == null ? null : o.getCustomerName(), o == null ? null : o.getCustomerPhone(),
                original == null ? null : original.getId(), original == null ? null : original.getPaymentCode(),
                original == null ? null : original.getPaymentMethod(), original == null ? 0 : nz(original.getTotalAmount()),
                original == null ? null : paymentReference(original));
    }

    private String paymentReference(Payment original) {
        return refundRepository.findQrReferences(original.getId()).stream().findFirst().orElse(null);
    }

    private static String requireReason(String reason) {
        String r = OrderSupportService.blankToNull(reason);
        if (r == null) throw ApiException.badRequest("Nhập lý do hoàn tiền.");
        if (r.length() > REASON_MAX) throw ApiException.badRequest("Lý do tối đa " + REASON_MAX + " ký tự.");
        return r;
    }

    private static String requireMethod(String method) {
        String m = method == null ? "" : method.trim().toUpperCase();
        if (!Payment.CASH.equals(m) && !Payment.BANK_TRANSFER.equals(m)) {
            throw ApiException.badRequest("Cách hoàn tiền chỉ là Tiền mặt hoặc Chuyển khoản.");
        }
        return m;
    }

    private static long gross(List<OrderItem> lines) {
        return lines.stream().mapToLong(i -> nz(i.getSubtotal())).sum();
    }

    /** "1× Bạc xỉu (29.000đ), 2× Trà đào (70.000đ)" */
    static String itemsText(List<OrderItem> lines) {
        return lines.stream()
                .map(i -> i.getQuantity() + "× " + i.getMenuItem().getName() + " (" + money(nz(i.getSubtotal())) + ")")
                .collect(Collectors.joining(", "));
    }

    /** Ghép thêm câu vào ghi chú, ưu tiên giữ nguyên câu mới (mã giao dịch) nếu quá dài. */
    static String joinNote(String base, String extra) {
        if (base == null || base.isBlank()) return limit(extra, NOTE_MAX);
        String joined = base + " " + extra;
        if (joined.length() <= NOTE_MAX) return joined;
        int keep = Math.max(0, NOTE_MAX - extra.length() - 2);
        return limit(base.substring(0, Math.min(base.length(), keep)) + "… " + extra, NOTE_MAX);
    }

    static String limit(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private static String customerName(Customer c) {
        if (c == null) return null;
        return c.getFullName() != null && !c.getFullName().isBlank() ? c.getFullName() : c.getPhoneNumber();
    }

    private static String staffName(User u) {
        if (u == null) return null;
        if (u.getFullName() != null && !u.getFullName().isBlank()) return u.getFullName();
        return u.getUsername();
    }

    private static String num(Order o) {
        return OrderSupportService.displayNumber(o.getOrderNumber());
    }

    private static long nz(Long v) {
        return v == null ? 0 : v;
    }

    private static String money(long v) {
        return String.format("%,d", v).replace(',', '.') + "đ";
    }
}
