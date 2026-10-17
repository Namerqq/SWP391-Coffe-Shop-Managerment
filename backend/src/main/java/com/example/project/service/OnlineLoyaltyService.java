package com.example.project.service;

import com.example.project.dto.onlinepay.OnlineLoyaltyView;
import com.example.project.entity.Customer;
import com.example.project.exception.ApiException;
import com.example.project.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Khách thân thiết cho khách đặt online (BF-03-2, ThangNN Iter2). Khách không đăng nhập, nhận diện bằng SĐT nhận hàng.
 * Quy tắc đã chốt:
 * - SĐT đã là thành viên: luôn gắn vào đơn và luôn được cộng điểm (khách không chọn "không tích điểm"), được dùng điểm.
 * - SĐT chưa là thành viên: khách chọn tham gia thì tạo thành viên mới; không chọn thì không lưu vào bảng customers.
 */
@Service
public class OnlineLoyaltyService {

    private final CustomerRepository customerRepository;
    private final SystemSettingService settings;

    public OnlineLoyaltyService(CustomerRepository customerRepository, SystemSettingService settings) {
        this.customerRepository = customerRepository;
        this.settings = settings;
    }

    /** Tra điểm theo SĐT. Không có thì member = false (không báo lỗi, để trang hiện ô "Tham gia thành viên"). */
    @Transactional(readOnly = true)
    public OnlineLoyaltyView lookup(String phone) {
        String p = normalizePhone(phone);
        long pointValue = Math.max(1, settings.getLong("loyalty.point_value_vnd", 1000));
        long vndPerPoint = Math.max(1, settings.getLong("loyalty.vnd_per_point", 10000));
        return customerRepository.findByPhoneNumber(p)
                .map(c -> new OnlineLoyaltyView(true, p, c.getFullName(),
                        c.getCurrentPoints() == null ? 0 : c.getCurrentPoints(), pointValue, vndPerPoint))
                .orElseGet(() -> new OnlineLoyaltyView(false, p, null, 0, pointValue, vndPerPoint));
    }

    /**
     * Khách thân thiết gắn với mã QR online (gọi trong transaction tạo mã: payOS lỗi thì thành viên mới cũng không được lưu).
     * - SĐT đã có: trả về khách đó, bất kể joinLoyalty (thành viên luôn được tích điểm).
     * - SĐT chưa có + joinLoyalty: tạo thành viên mới 0 điểm, tên = tên người nhận (DBR-03).
     * - SĐT chưa có + không tham gia: null (SĐT chỉ lưu trong giỏ hàng / đơn, không vào bảng customers).
     */
    @Transactional
    public Customer resolveCustomer(String phone, String fullName, boolean joinLoyalty) {
        String p = normalizePhone(phone);
        Customer existing = customerRepository.findByPhoneNumber(p).orElse(null);
        if (existing != null || !joinLoyalty) return existing;
        Customer c = new Customer();
        c.setPhoneNumber(p);
        c.setFullName(OrderSupportService.blankToNull(fullName));
        c.setCurrentPoints(0);
        return customerRepository.save(c);
    }

    /** Bỏ khoảng trắng, dấu chấm, gạch; số Việt Nam 10-11 số bắt đầu bằng 0 (giống màn Thu ngân). */
    public static String normalizePhone(String phone) {
        String p = phone == null ? "" : phone.replaceAll("[\\s.\\-]", "");
        if (!p.matches("^0\\d{9,10}$")) {
            throw ApiException.badRequest("Số điện thoại gồm 10-11 chữ số và bắt đầu bằng 0.");
        }
        return p;
    }
}
