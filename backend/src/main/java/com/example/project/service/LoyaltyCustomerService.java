package com.example.project.service;

import com.example.project.dto.cashier.CustomerUpdateRequest;
import com.example.project.dto.cashier.LoyaltyCustomerPage;
import com.example.project.dto.cashier.LoyaltyCustomerRow;
import com.example.project.dto.cashier.LoyaltyHistoryView;
import com.example.project.entity.Customer;
import com.example.project.entity.LoyaltyTransaction;
import com.example.project.entity.Payment;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.LoyaltyCustomerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Loyalty Customer List & Point History (ThangNN Iter3) — SRS 1.3.7, UC-C12 / UC-C10 / UC-C13.
 * - Danh sách khách thân thiết: tìm theo SĐT hoặc tên, sắp xếp, phân trang.
 * - Lịch sử điểm của 1 khách: chỉ xem, giao dịch điểm không sửa / xóa và thu ngân không tự cộng / trừ điểm
 *   (SRS 4.4 [11]); điểm chỉ thay đổi khi thanh toán (CashierService.record).
 * - Chỉ sửa được TÊN khách. Số điện thoại là định danh để tích / dùng điểm nên thu ngân không sửa được
 *   (tránh chuyển nhầm điểm sang người khác); muốn dùng số khác thì đăng ký khách mới.
 * - Đăng ký khách mới dùng lại POST /api/cashier/customers (CashierService.createCustomer).
 * Không có xóa khách (Permission Matrix chỉ cho Create / View / Update).
 */
@Service
public class LoyaltyCustomerService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    private final LoyaltyCustomerRepository repository;

    public LoyaltyCustomerService(LoyaltyCustomerRepository repository) {
        this.repository = repository;
    }

    /**
     * @param keyword 1 phần SĐT hoặc tên (bỏ trống = mọi khách). Nhập SĐT có dấu cách / chấm / gạch vẫn tìm được.
     * @param sort    recent (mới đăng ký trước, mặc định) | points (điểm cao trước) | name (tên A-Z)
     */
    @Transactional(readOnly = true)
    public LoyaltyCustomerPage list(String keyword, String sort, Integer page, Integer size) {
        int p = page == null ? 0 : Math.max(0, page);
        int s = size == null ? DEFAULT_PAGE_SIZE : Math.min(MAX_PAGE_SIZE, Math.max(1, size));
        Page<Customer> result = repository.search(normalizeKeyword(keyword), PageRequest.of(p, s, sortOf(sort)));

        Map<Long, LocalDateTime> last = new HashMap<>();
        List<Long> ids = result.getContent().stream().map(Customer::getId).toList();
        if (!ids.isEmpty()) {
            for (Object[] r : repository.lastActivity(ids)) last.put((Long) r[0], (LocalDateTime) r[1]);
        }
        List<LoyaltyCustomerRow> items = result.getContent().stream()
                .map(c -> LoyaltyCustomerRow.from(c, last.get(c.getId())))
                .toList();
        return new LoyaltyCustomerPage(items, p, s, result.getTotalElements(), result.getTotalPages());
    }

    /** Lịch sử điểm của 1 khách, mới nhất trước, kèm số điểm sau mỗi giao dịch. */
    @Transactional(readOnly = true)
    public LoyaltyHistoryView history(Long customerId) {
        Customer c = find(customerId);
        List<LoyaltyTransaction> txs = repository.history(customerId);

        // Tính ngược: sau giao dịch mới nhất = điểm hiện có; giao dịch cũ hơn = số sau giao dịch kế tiếp trừ đi thay đổi đó.
        int balance = c.getCurrentPoints() == null ? 0 : c.getCurrentPoints();
        int earned = 0;
        int redeemed = 0;
        List<LoyaltyHistoryView.Entry> entries = new ArrayList<>(txs.size());
        for (LoyaltyTransaction t : txs) {
            int change = t.getPointsChange() == null ? 0 : t.getPointsChange();
            Payment pay = t.getPayment();
            entries.add(new LoyaltyHistoryView.Entry(t.getId(), t.getTransactionType(), change, balance, t.getNote(),
                    t.getCreatedAt(), pay == null ? null : pay.getId(), pay == null ? null : pay.getPaymentCode()));
            balance -= change;
            if (LoyaltyTransaction.EARN.equals(t.getTransactionType())) earned += change;
            if (LoyaltyTransaction.REDEEM.equals(t.getTransactionType())) redeemed += -change;
        }
        LocalDateTime lastActivity = txs.isEmpty() ? null : txs.get(0).getCreatedAt();
        return new LoyaltyHistoryView(LoyaltyCustomerRow.from(c, lastActivity), earned, redeemed, entries);
    }

    /** Chỉ sửa tên. SĐT giữ nguyên (body có gửi phoneNumber cũng bỏ qua). Tên bỏ trống = không có tên. */
    @Transactional
    public LoyaltyCustomerRow update(Long customerId, CustomerUpdateRequest req) {
        Customer c = find(customerId);
        c.setFullName(OrderSupportService.blankToNull(req.fullName()));
        Customer saved = repository.save(c);
        List<LoyaltyTransaction> txs = repository.history(customerId);
        return LoyaltyCustomerRow.from(saved, txs.isEmpty() ? null : txs.get(0).getCreatedAt());
    }

    private Customer find(Long customerId) {
        return repository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách thân thiết id = " + customerId));
    }

    /** Bỏ trống -> null. Chỉ gồm số và dấu cách / chấm / gạch -> coi là SĐT, bỏ dấu ngăn cách. */
    static String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String k = keyword.trim();
        if (k.matches("[\\d\\s.\\-]+")) k = k.replaceAll("[\\s.\\-]", "");
        return k.isEmpty() ? null : k;
    }

    static Sort sortOf(String sort) {
        if ("points".equals(sort)) return Sort.by(Sort.Order.desc("currentPoints"), Sort.Order.desc("id"));
        if ("name".equals(sort)) return Sort.by(Sort.Order.asc("fullName"), Sort.Order.asc("id"));
        return Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    }
}
