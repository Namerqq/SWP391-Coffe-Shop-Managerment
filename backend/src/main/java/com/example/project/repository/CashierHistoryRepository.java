package com.example.project.repository;

import com.example.project.entity.Order;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
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

    /** Hoàn tiền: tiền đã trả lại khách trong khoảng [from, to) theo cách hoàn: [paymentMethod, số phiếu, tổng tiền]. */
    @Query("select p.paymentMethod, count(p), coalesce(sum(p.totalAmount), 0) from Payment p "
            + "where p.paymentStatus = 'REFUNDED' and p.paidAt >= :from and p.paidAt < :to group by p.paymentMethod")
    List<Object[]> sumRefundedByMethod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Hoàn tiền theo đơn: [orderId, paymentStatus (REFUND_PENDING / REFUNDED), tổng tiền]. */
    @Query("select p.order.id, p.paymentStatus, coalesce(sum(p.totalAmount), 0) from Payment p "
            + "where p.order.id in :orderIds and p.paymentStatus in ('REFUND_PENDING', 'REFUNDED') "
            + "group by p.order.id, p.paymentStatus")
    List<Object[]> sumRefundsByOrder(@Param("orderIds") Collection<Long> orderIds);
}
