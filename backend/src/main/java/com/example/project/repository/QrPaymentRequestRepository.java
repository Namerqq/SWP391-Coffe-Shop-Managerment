package com.example.project.repository;

import com.example.project.entity.QrPaymentRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface QrPaymentRequestRepository extends JpaRepository<QrPaymentRequest, Long> {

    boolean existsByOrderCode(Long orderCode);

    Optional<QrPaymentRequest> findByOrderCode(Long orderCode);

    /** Hóa đơn này có được hệ thống tự xác nhận qua QR payOS không (in trên hóa đơn). */
    boolean existsByPayment_Id(Long paymentId);

    /** Đọc kèm khóa dòng: webhook và lần hỏi định kỳ cùng về thì người sau thấy mã đã PAID, không ghi 2 lần. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from QrPaymentRequest r where r.id = :id")
    Optional<QrPaymentRequest> findWithLockById(@Param("id") Long id);

    List<QrPaymentRequest> findByStatusOrderByCreatedAtAsc(String status);

    List<QrPaymentRequest> findByStatusAndTableSession_IdOrderByCreatedAtAsc(String status, Long tableSessionId);

    List<QrPaymentRequest> findByStatusAndTargetTypeOrderByCreatedAtAsc(String status, String targetType);

    /** Mã vừa đổi sang các trạng thái cần báo cho thu ngân (PAID, MISMATCH). */
    List<QrPaymentRequest> findByStatusInAndStatusChangedAtAfterOrderByStatusChangedAtAsc(
            Collection<String> statuses, LocalDateTime after);

    /** Các mã QR đang chờ có chứa 1 trong các đơn này. */
    @Query("select distinct r from QrPaymentRequest r join r.orders o where r.status = 'PENDING' and o.id in :orderIds")
    List<QrPaymentRequest> findPendingContaining(@Param("orderIds") Collection<Long> orderIds);

    @Query("select count(r) from QrPaymentRequest r join r.orders o where r.status = 'PENDING' and o.id = :orderId")
    long countPendingContaining(@Param("orderId") Long orderId);

    /** Tổng điểm của khách đang bị giữ bởi các mã QR chờ thanh toán (trừ mã excludeId). null = không có. */
    @Query("select sum(r.pointsToRedeem) from QrPaymentRequest r "
            + "where r.status = 'PENDING' and r.customer.id = :customerId and r.id <> :excludeId")
    Long sumHeldPoints(@Param("customerId") Long customerId, @Param("excludeId") Long excludeId);
}
