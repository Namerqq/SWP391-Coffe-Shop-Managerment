package com.example.project.repository;

import com.example.project.entity.Order;
import com.example.project.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Hoàn tiền (ThangNN Iter3). Mỗi lần hoàn là 1 dòng payments có payment_status REFUND_PENDING / REFUNDED,
 * gắn order_id của đơn được hoàn; hóa đơn gốc = order.payment. Tách riêng để không sửa PaymentRepository dùng chung.
 */
public interface RefundRepository extends Repository<Payment, Long> {

    /** Các dòng hoàn tiền (chờ chuyển khoản + đã hoàn) của 1 hóa đơn gốc, cũ trước. */
    @Query("select r from Payment r where r.order.payment.id = :paymentId "
            + "and r.paymentStatus in ('REFUND_PENDING', 'REFUNDED') order by r.id")
    List<Payment> findRefundsOf(@Param("paymentId") Long paymentId);

    /** Tổng tiền đã hoàn / đang chờ hoàn của 1 hóa đơn gốc. */
    @Query("select coalesce(sum(r.totalAmount), 0) from Payment r where r.order.payment.id = :paymentId "
            + "and r.paymentStatus in ('REFUND_PENDING', 'REFUNDED')")
    Long sumRefundsOf(@Param("paymentId") Long paymentId);

    /** Phiếu hoàn theo trạng thái, cũ trước (thu ngân xử lý phiếu chờ lâu nhất trước). */
    List<Payment> findByPaymentStatusOrderByCreatedAtAsc(String paymentStatus);

    /** Phiếu hoàn tạo trong khoảng [from, to), mới nhất trước. */
    @Query("select r from Payment r where r.paymentStatus in :statuses "
            + "and r.createdAt >= :from and r.createdAt < :to order by r.createdAt desc")
    List<Payment> findRefundsCreatedBetween(@Param("statuses") Collection<String> statuses,
                                            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Đọc 1 phiếu hoàn kèm khóa dòng: 2 thu ngân cùng bấm "Đã chuyển" thì người sau thấy phiếu đã xong. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Payment r where r.id = :id")
    Optional<Payment> findRefundWithLockById(@Param("id") Long id);

    /**
     * Lượt khách (bàn) của 1 đơn, đọc riêng 1 giá trị để chưa nạp đơn vào bộ nhớ trước khi khóa.
     * Đơn mang đi / online hoặc không có đơn -> rỗng.
     */
    @Query("select s.id from Order o left join o.tableSession s where o.id = :orderId")
    Optional<Long> findSessionIdOfOrder(@Param("orderId") Long orderId);

    /**
     * Đơn online đã thanh toán (QR) nhưng đã bị hủy (giao không thành công...) mà chưa có phiếu hoàn nào:
     * thu ngân cần tạo phiếu hoàn. Hủy gần nhất trước.
     */
    @Query("select o from Order o where o.fulfillmentType = 'DELIVERY' and o.paymentStatus = 'PAID' "
            + "and o.status in ('CANCELLED', 'REJECTED') and not exists (select r.id from Payment r where r.order = o "
            + "and r.paymentStatus in ('REFUND_PENDING', 'REFUNDED')) order by o.cancelledAt desc")
    List<Order> findCancelledPaidDeliveryWithoutRefund();

    /** Mã giao dịch ngân hàng của lần khách trả bằng QR payOS (để thu ngân tra tài khoản đã chuyển tiền). */
    @Query("select q.bankReference from QrPaymentRequest q where q.payment.id = :paymentId and q.bankReference is not null")
    List<String> findQrReferences(@Param("paymentId") Long paymentId);
}
