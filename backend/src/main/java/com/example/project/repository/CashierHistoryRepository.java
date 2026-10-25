package com.example.project.repository;

import com.example.project.entity.Order;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Chỉ đọc: lịch sử đơn và hóa đơn theo ngày cho Thu ngân (ThangNN Iter3, UC-C15).
 * Tách riêng để không sửa OrderRepository / PaymentRepository dùng chung.
 */
public interface CashierHistoryRepository extends Repository<Order, Long> {

    /** Đơn tạo trong khoảng [from, to), mới nhất trước. */
    List<Order> findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(LocalDateTime from,
                                                                                        LocalDateTime to);

    /** Tiền đã thu trong khoảng [from, to) theo phương thức: mỗi dòng [paymentMethod, số hóa đơn, tổng tiền]. */
    @Query("select p.paymentMethod, count(p), coalesce(sum(p.totalAmount), 0) from Payment p "
            + "where p.paymentStatus = 'PAID' and p.paidAt >= :from and p.paidAt < :to group by p.paymentMethod")
    List<Object[]> sumPaidByMethod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
