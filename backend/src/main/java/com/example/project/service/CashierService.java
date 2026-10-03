package com.example.project.service;

import com.example.project.dto.cashier.CustomerCreateRequest;
import com.example.project.dto.cashier.PayRequest;
import com.example.project.dto.cashier.PaymentResult;
import com.example.project.dto.cashier.PaymentSettingsView;
import com.example.project.dto.cashier.ReceiptView;
import com.example.project.dto.order.CustomerView;
import com.example.project.entity.CafeTable;
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
import com.example.project.repository.OrderRepository;
import com.example.project.repository.PaymentRepository;
import com.example.project.repository.TableSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Thu ngân: UC-C01..C04 bán mang đi, UC-C05/C07/C08 thanh toán, UC-C09 hóa đơn,
 * UC-C10/C13 tìm / đăng ký khách thân thiết, UC-C11/C14 dùng và cộng điểm.
 * Không tính VAT. Quy đổi điểm lấy từ Cài đặt hệ thống (loyalty.vnd_per_point, loyalty.point_value_vnd).
 */
@Service
public class CashierService {

    private final CustomerRepository customerRepository;
    private final TableSessionRepository sessionRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final LoyaltyTransactionRepository loyaltyRepository;
    private final OrderSupportService support;
    private final SystemSettingService settings;

    public CashierService(CustomerRepository customerRepository, TableSessionRepository sessionRepository,
                          OrderRepository orderRepository, PaymentRepository paymentRepository,
                          LoyaltyTransactionRepository loyaltyRepository, OrderSupportService support,
                          SystemSettingService settings) {
        this.customerRepository = customerRepository;
        this.sessionRepository = sessionRepository;
        this.orderRepository = orderRepository;
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

    // ===== UC-C05 / C07 / C08: thanh toán bàn (chỉ khi mọi đơn đã phục vụ) =====

    @Transactional
    public PaymentResult paySession(Long sessionId, PayRequest req, User cashier) {
        TableSession s = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lượt khách id = " + sessionId));
        if (!s.isActive()) throw ApiException.badRequest("Lượt khách này đã được thanh toán hoặc đã đóng.");

        List<Order> valid = orderRepository.findByTableSession_IdOrderByCreatedAtAsc(sessionId).stream()
                .filter(o -> !TableBoardService.isCancelled(o))
                .toList();
        if (valid.isEmpty()) throw ApiException.badRequest("Bàn chưa có món nào để thanh toán.");
        List<String> unfinished = valid.stream()
                .filter(o -> !Order.SERVED.equals(o.getStatus()))
                .map(o -> OrderSupportService.displayNumber(o.getOrderNumber()))
                .toList();
        if (!unfinished.isEmpty()) {
            throw ApiException.badRequest("Còn đơn chưa phục vụ xong: " + String.join(", ", unfinished) + ".");
        }
        long subtotal = valid.stream().mapToLong(Order::activeTotal).sum();

        Customer customer = findCustomerOrNull(req.customerId());
        Payment p = new Payment();
        p.setTableSession(s);
        settle(p, subtotal, req.method(), customer, req.pointsToRedeem(), cashier, s);

        // Đóng lượt khách, trả bàn về trống (GB-04)
        if (customer != null) s.setCustomer(customer);
        s.setStatus(TableSession.CLOSED);
        s.setClosedAt(LocalDateTime.now());
        s.getTable().setStatus(CafeTable.AVAILABLE);
        sessionRepository.save(s);
        return new PaymentResult(p.getId(), p.getPaymentCode(), p.getTotalAmount(), null, null);
    }

    // ===== UC-C09: hóa đơn =====

    @Transactional(readOnly = true)
    public ReceiptView receipt(Long paymentId) {
        Payment p = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn id = " + paymentId));
        TableSession s = p.getTableSession();
        Order single = p.getOrder();
        List<Order> orders;
        String place;
        if (s != null) {
            orders = orderRepository.findByTableSession_IdOrderByCreatedAtAsc(s.getId()).stream()
                    .filter(o -> Order.SERVED.equals(o.getStatus()))
                    .toList();
            place = s.getTable().getTableNumber();
        } else {
            orders = single == null ? List.of() : List.of(single);
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
                redeemed, earned, CustomerView.from(customer));
    }

    // ===== Dùng chung =====

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
}
