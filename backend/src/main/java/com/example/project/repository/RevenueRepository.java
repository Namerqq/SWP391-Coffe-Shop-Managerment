package com.example.project.repository;

import com.example.project.entity.Payment;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Chỉ đọc: số liệu doanh thu cho Quản lý (UC-RP01 View Order Statistics).
 * Doanh thu = tiền đã thu theo hóa đơn (payments PAID), tính theo giờ thu tiền paidAt.
 * Tách riêng để không sửa PaymentRepository / OrderItemRepository dùng chung.
 */
public interface RevenueRepository extends Repository<Payment, Long> {

    /** Hóa đơn đã thu trong khoảng [from, to): mỗi dòng [paidAt, paymentMethod, totalAmount]. Gom nhóm làm ở service. */
    @Query("select p.paidAt, p.paymentMethod, p.totalAmount from Payment p "
            + "where p.paymentStatus = 'PAID' and p.paidAt >= :from and p.paidAt < :to")
    List<Object[]> findPaid(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /**
     * Món bán được trong khoảng [from, to) (đơn thuộc hóa đơn đã thu, bỏ món đã hủy), nhiều nhất trước:
     * mỗi dòng [tên món, tổng số lượng, tổng thành tiền]. Thành tiền theo giá món, chưa trừ giảm giá bằng điểm.
     */
    @Query("select i.menuItem.name, sum(i.quantity), sum(i.subtotal) from OrderItem i join i.order o join o.payment p "
            + "where p.paymentStatus = 'PAID' and p.paidAt >= :from and p.paidAt < :to and i.itemStatus <> 'CANCELLED' "
            + "group by i.menuItem.id, i.menuItem.name order by sum(i.quantity) desc, sum(i.subtotal) desc")
    List<Object[]> sumSoldItems(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
