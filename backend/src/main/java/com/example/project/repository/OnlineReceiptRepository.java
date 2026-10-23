package com.example.project.repository;

import com.example.project.entity.Order;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/**
 * Chỉ đọc: hóa đơn điện tử của khách đặt online (ThangNN Iter2). Tách riêng để không sửa OrderRepository dùng chung.
 */
public interface OnlineReceiptRepository extends Repository<Order, Long> {

    /** Đơn theo mã đơn (order_number dạng yyMMdd-0001), đúng nguồn (ONLINE). */
    Optional<Order> findFirstBySourceAndOrderNumberOrderByIdDesc(String source, String orderNumber);
}
