package com.example.project.repository;

import com.example.project.entity.Order;
import org.springframework.data.repository.Repository;

import java.util.List;

/**
 * Chỉ đọc: hóa đơn điện tử của khách đặt online (ThangNN Iter2). Tách riêng để không sửa OrderRepository dùng chung.
 */
public interface OnlineReceiptRepository extends Repository<Order, Long> {

    /** 20 đơn gần nhất theo SĐT nhận hàng, đúng nguồn (ONLINE) và đã thanh toán (PAID), mới trả trước. */
    List<Order> findTop20BySourceAndCustomerPhoneAndPaymentStatusOrderByPaidAtDesc(
            String source, String customerPhone, String paymentStatus);
}
