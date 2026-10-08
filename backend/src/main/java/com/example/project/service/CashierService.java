package com.example.project.service;

import com.example.project.dto.cashier.CustomerCreateRequest;
import com.example.project.dto.cashier.PayRequest;
import com.example.project.dto.cashier.PaymentResult;
import com.example.project.dto.cashier.PaymentSettingsView;
import com.example.project.dto.cashier.ReceiptView;
import com.example.project.dto.cashier.TakeawayRequest;
import com.example.project.dto.order.CustomerView;
import com.example.project.entity.Customer;
import com.example.project.entity.LoyaltyTransaction;
import com.example.project.entity.Order;
import com.example.project.entity.Payment;
import com.example.project.entity.TableSession;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CustomerRepository;
import com.example.project.repository.LoyaltyTransactionRepository;
import com.example.project.repository.OrderLockRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.PaymentRepository;
import com.example.project.repository.TableSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Thu ngân: UC-C01..C04 bán mang đi, UC-C05/C07/C08 thanh toán, UC-C09 hóa đơn,
 * UC-C10/C13 tìm / đăng ký khách thân thiết, UC-C11/C14 dùng và cộng điểm.
 * Không tính VAT. Quy đổi điểm lấy từ Cài đặt hệ thống (loyalty.vnd_per_point, loyalty.point_value_vnd).
 *
 * Từ V6 mỗi đơn có 2 trạng thái song song: đã phục vụ chưa (status) và đã thanh toán chưa (paymentStatus).
 * Thu ngân thu tiền được BẤT KỲ đơn nào chưa thanh toán, đơn ở trạng thái phục vụ nào cũng được (trừ đơn đã hủy).
 * Bàn chỉ trả về trống khi mọi đơn vừa đã phục vụ vừa đã thanh toán.
 */
@Service
public class CashierService {

    private final CustomerRepository customerRepository;
    private final TableSessionRepository sessionRepository;
    private final OrderRepository orderRepository;
    private final OrderLockRepository lockRepository;
    private final PaymentRepository paymentRepository;
    private final LoyaltyTransactionRepository loyaltyRepository;
    private final OrderSupportService support;
    private final SystemSettingService settings;

    public CashierService(CustomerRepository customerRepository, TableSessionRepository sessionRepository,
                          OrderRepository orderRepository, OrderLockRepository lockRepository,
                          PaymentRepository paymentRepository, LoyaltyTransactionRepository loyaltyRepository,
                          OrderSupportService support, SystemSettingService settings) {
        this.customerRepository = customerRepository;
        this.sessionRepository = sessionRepository;
        this.orderRepository = orderRepository;
        this.lockRepository = lockRepository;
        this.paymentRepository = paymentRepository;
        this.loyaltyRepository = loyaltyRepository;
        this.support = support;
        this.settings = settings;
    }

    // ===== UC-C10 / UC-C13: khách thân thiết =====

    @Transactional(readOnly = true)
    public CustomerView findCustomer(String phone) {
        String p = normalizePhone(phone);
        return customerRepository.findByPhoneNumber(p).map(CustomerView::from)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có khách thân thiết với số " + p + "."));
    }

    @Transactional
    public CustomerView createCustomer(CustomerCreateRequest req) {
        String p = normalizePhone(req.phoneNumber());
        if (customerRepository.existsByPhoneNumber(p)) {
            throw ApiException.conflict("Số " + p + " đã là khách thân thiết.");
        }
        Customer c = new Customer();
        c.setPhoneNumber(p);
        c.setFullName(OrderSupportService.blankToNull(req.fullName()));
        c.setCurrentPoints(0);
        return CustomerView.from(customerRepository.save(c));
    }

    public PaymentSettingsView paymentSettings() {
        return new PaymentSettingsView(pointValue(), vndPerPoint(),
                settings.get("payment.bank_bin", ""),
                settings.get("payment.bank_account_number", ""),
                settings.get("payment.bank_account_holder", ""));
    }

    // ===== UC-C05 / C07 / C08: thu tiền đơn tại bàn, đơn ở trạng thái phục vụ nào cũng được =====

    /**
     * Thu tiền các đơn chưa thanh toán của 1 lượt khách. req.orderIds bỏ trống = thu mọi đơn chưa thanh toán.
     * Đơn chưa pha / đang pha / chờ mang ra vẫn thu được, món vẫn được pha và mang ra như bình thường.
     * Bàn chỉ trả về trống khi mọi đơn đã phục vụ VÀ đã thanh toán (GB-04).
     */
    @Transactional
    public PaymentResult paySession(Long sessionId, PayRequest req, User cashier) {
        TableSession s = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lượt khách id = " + sessionId));
        if (!s.isActive()) throw ApiException.badRequest("Lượt khách này đã xong, bàn đã trả về trống.");

        // Khóa các đơn của bàn: 2 thu ngân bấm cùng lúc thì người sau thấy đơn đã thu, không thu 2 lần.
        List<Order> sessionOrders = lockRepository.findWithLockByTableSession_IdOrderByCreatedAtAsc(sessionId);
        List<Order> toPay = pickOrdersToPay(sessionOrders, req.orderIds());
        long subtotal = toPay.stream().mapToLong(Order::activeTotal).sum();
        if (req.expectedSubtotal() != null && req.expectedSubtotal() != subtotal) {
            throw ApiException.conflict("Đơn vừa thay đổi, số tiền cần thu bây giờ là " + money(subtotal)
                    + ". Vui lòng đóng hộp thanh toán và kiểm tra lại hóa đơn.");
        }

        Customer customer = findCustomerOrNull(req.customerId());
        Payment p = new Payment();
        p.setTableSession(s);
        settle(p, subtotal, req.method(), customer, req.pointsToRedeem(), cashier, s);
        toPay.forEach(o -> o.markPaid(p));
        orderRepository.saveAll(toPay);

        if (customer != null) s.setCustomer(customer);
        // Còn đơn chưa phục vụ xong thì bàn vẫn mở; mọi đơn đã phục vụ + đã thanh toán thì trả bàn.
        boolean released = support.closeSessionIfSettled(s);
        sessionRepository.save(s);
        return new PaymentResult(p.getId(), p.getPaymentCode(), p.getTotalAmount(), null, null, released);
    }

    // ===== UC-C01..C04: bán mang đi, khách trả tiền trước =====

    @Transactional
    public PaymentResult takeaway(TakeawayRequest req, User cashier) {
        if (req.items() == null || req.items().isEmpty()) throw ApiException.badRequest("Chưa chọn món nào.");
        Customer customer = findCustomerOrNull(req.customerId());

        Order o = new Order();
        o.setOrderNumber(support.nextOrderNumber());
        o.setSource(Order.SOURCE_STAFF);
        o.setFulfillmentType(Order.PICKUP);
        o.setStatus(Order.PENDING);
        o.setCreatedBy(cashier);
        o.setCustomerNote(OrderSupportService.blankToNull(req.note()));
        if (customer != null) {
            o.setCustomer(customer);
            o.setCustomerName(customer.getFullName());
            o.setCustomerPhone(customer.getPhoneNumber());
        }
        req.items().forEach(i -> o.addItem(support.buildItem(i)));
        o.recalcTotal();
        orderRepository.save(o);

        Payment p = new Payment();
        p.setOrder(o);
        settle(p, o.getTotalAmount(), req.method(), customer, req.pointsToRedeem(), cashier, null);
        o.markPaid(p); // trả trước: đơn vào hàng chờ pha với trạng thái Đã thanh toán
        orderRepository.save(o);
        return new PaymentResult(p.getId(), p.getPaymentCode(), p.getTotalAmount(), o.getId(), o.getOrderNumber(), false);
    }

    // ===== UC-C09: hóa đơn =====

    @Transactional(readOnly = true)
    public ReceiptView receipt(Long paymentId) {
        Payment p = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn id = " + paymentId));
        TableSession s = p.getTableSession();
        Order single = p.getOrder();
        // Các đơn được thu trong hóa đơn này: mang đi = 1 đơn; tại bàn = các đơn thu ngân đã chọn khi thu.
        List<Order> orders = single != null ? List.of(single)
                : orderRepository.findByPayment_IdOrderByCreatedAtAsc(p.getId());
        String place;
        if (s != null) {
            place = s.getTable().getTableNumber();
        } else {
            place = single == null ? "Mang đi" : "Mang đi " + OrderSupportService.displayNumber(single.getOrderNumber());
        }
        long subtotal = orders.stream().mapToLong(Order::activeTotal).sum();

        int redeemed = 0;
        int earned = 0;
        Customer customer = null;
        for (LoyaltyTransaction t : loyaltyRepository.findByPayment_Id(p.getId())) {
            customer = t.getCustomer();
            if (LoyaltyTransaction.REDEEM.equals(t.getTransactionType())) redeemed += -t.getPointsChange();
            else if (LoyaltyTransaction.EARN.equals(t.getTransactionType())) earned += t.getPointsChange();
        }
        if (customer == null) customer = s != null ? s.getCustomer() : (single == null ? null : single.getCustomer());

        User cashier = p.getConfirmedBy();
        return new ReceiptView(
                settings.get("shop.name", "Cafe Shop"), settings.get("shop.address", ""), settings.get("shop.phone", ""),
                p.getId(), p.getPaymentCode(), p.getPaidAt(), cashier == null ? null : cashier.getFullName(),
                p.getPaymentMethod(), place, s == null, s == null ? null : s.getSessionCode(),
                orders.stream().map(support::toView).toList(),
                subtotal, Math.max(0, subtotal - p.getTotalAmount()), p.getTotalAmount(),
                redeemed, earned, CustomerView.from(customer),
                s == null ? null : s.getTable().getId(), s != null && s.isActive());
    }

    // ===== Dùng chung =====

    /**
     * Chọn đơn để thu. orderIds bỏ trống = mọi đơn chưa thanh toán của bàn (trừ đơn đã hủy).
     * Đơn được chọn phải thuộc bàn, chưa hủy, chưa thanh toán; đơn ở trạng thái phục vụ nào cũng được.
     */
    private static List<Order> pickOrdersToPay(List<Order> sessionOrders, List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            List<Order> unpaid = sessionOrders.stream().filter(o -> !o.isCancelled() && !o.isPaid()).toList();
            if (unpaid.isEmpty()) throw ApiException.badRequest("Bàn không còn đơn nào chưa thanh toán.");
            return unpaid;
        }
        Map<Long, Order> byId = sessionOrders.stream().collect(Collectors.toMap(Order::getId, Function.identity()));
        List<Order> picked = new ArrayList<>();
        List<String> problems = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(orderIds)) {
            Order o = byId.get(id);
            if (o == null) problems.add("đơn id " + id + " không thuộc bàn này");
            else if (o.isCancelled()) problems.add(num(o) + " đã hủy");
            else if (o.isPaid()) problems.add(num(o) + " đã được thanh toán");
            else picked.add(o);
        }
        if (!problems.isEmpty()) {
            throw ApiException.conflict("Không thu được: " + String.join(", ", problems) + ". Vui lòng tải lại hóa đơn.");
        }
        return picked;
    }

    /**
     * Ghi nhận thanh toán đã thu (PAID) + trừ điểm đã dùng (REDEEM) + cộng điểm (EARN).
     * Điểm cộng tính trên số tiền thực trả sau giảm giá.
     */
    private void settle(Payment p, long subtotal, String method, Customer customer, Integer pointsToRedeem,
                        User cashier, TableSession session) {
        String m = method == null ? "" : method.trim().toUpperCase();
        if (!Payment.CASH.equals(m) && !Payment.BANK_TRANSFER.equals(m)) {
            throw ApiException.badRequest("Cách thanh toán chỉ là Tiền mặt hoặc Chuyển khoản.");
        }
        int redeem = pointsToRedeem == null ? 0 : pointsToRedeem;
        if (redeem < 0) throw ApiException.badRequest("Số điểm dùng không hợp lệ.");
        long pointValue = pointValue();
        if (redeem > 0) {
            if (customer == null) throw ApiException.badRequest("Hãy chọn khách thân thiết trước khi dùng điểm.");
            if (redeem > customer.getCurrentPoints()) {
                throw ApiException.badRequest("Khách chỉ có " + customer.getCurrentPoints() + " điểm.");
            }
            long maxRedeem = subtotal / pointValue;
            if (redeem > maxRedeem) throw ApiException.badRequest("Hóa đơn này dùng tối đa " + maxRedeem + " điểm.");
        }
        long discount = redeem * pointValue;
        long amount = subtotal - discount;

        p.setPaymentCode(support.nextPaymentCode());
        p.setPaymentMethod(m);
        p.setTotalAmount(amount);
        p.setPaymentStatus(Payment.PAID);
        p.setPaidAt(LocalDateTime.now());
        p.setConfirmedBy(cashier);
        paymentRepository.save(p);

        if (customer == null) return;
        int points = customer.getCurrentPoints();
        if (redeem > 0) {
            loyaltyRepository.save(LoyaltyTransaction.of(customer, p, session, -redeem, LoyaltyTransaction.REDEEM,
                    "Dùng " + redeem + " điểm, giảm " + String.format("%,d", discount).replace(',', '.') + "đ"));
            points -= redeem;
        }
        int earned = (int) (amount / vndPerPoint());
        if (earned > 0) {
            loyaltyRepository.save(LoyaltyTransaction.of(customer, p, session, earned, LoyaltyTransaction.EARN,
                    "Tích điểm hóa đơn " + p.getPaymentCode()));
            points += earned;
        }
        customer.setCurrentPoints(points);
        customerRepository.save(customer);
    }

    private Customer findCustomerOrNull(Long customerId) {
        if (customerId == null) return null;
        return customerRepository.findById(customerId)
                .orElseThrow(() -> ApiException.badRequest("Không tìm thấy khách thân thiết id = " + customerId));
    }

    /** Bỏ khoảng trắng, dấu chấm, gạch; số Việt Nam 10-11 số bắt đầu bằng 0. */
    private static String normalizePhone(String phone) {
        String p = phone == null ? "" : phone.replaceAll("[\\s.\\-]", "");
        if (!p.matches("^0\\d{9,10}$")) {
            throw ApiException.badRequest("Số điện thoại gồm 10-11 chữ số và bắt đầu bằng 0.");
        }
        return p;
    }

    private long pointValue() {
        return Math.max(1, settings.getLong("loyalty.point_value_vnd", 1000));
    }

    private long vndPerPoint() {
        return Math.max(1, settings.getLong("loyalty.vnd_per_point", 10000));
    }

    private static String num(Order o) {
        return OrderSupportService.displayNumber(o.getOrderNumber());
    }

    private static String money(long v) {
        return String.format("%,d", v).replace(',', '.') + "đ";
    }
}
