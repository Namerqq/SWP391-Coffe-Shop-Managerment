package com.example.project.service;

import com.example.project.dto.cashier.CustomerCreateRequest;
import com.example.project.dto.order.CustomerView;
import com.example.project.entity.Customer;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CustomerRepository;
import com.example.project.repository.LoyaltyTransactionRepository;
import com.example.project.repository.OrderRepository;
import com.example.project.repository.PaymentRepository;
import com.example.project.repository.TableSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /** Bỏ khoảng trắng, dấu chấm, gạch; số Việt Nam 10-11 số bắt đầu bằng 0. */
    private static String normalizePhone(String phone) {
        String p = phone == null ? "" : phone.replaceAll("[\\s.\\-]", "");
        if (!p.matches("^0\\d{9,10}$")) {
            throw ApiException.badRequest("Số điện thoại gồm 10-11 chữ số và bắt đầu bằng 0.");
        }
        return p;
    }
}
