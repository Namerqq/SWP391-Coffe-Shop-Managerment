package com.example.project.repository;

import com.example.project.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Đọc đơn kèm khóa dòng (SELECT ... FOR UPDATE) để khách hủy đơn không "đè" lên thao tác
 * Bắt đầu pha của pha chế xảy ra cùng lúc: ai lấy khóa trước thì người sau đọc lại trạng thái mới.
 */
public interface OrderLockRepository extends Repository<Order, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Order> findWithLockById(Long id);

    /** Đơn online theo mã đơn, kèm khóa dòng: khách tự hủy cùng lúc thu ngân xác nhận / hủy thì người sau chờ. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Order> findFirstWithLockByOrderNumberAndSourceOrderByIdDesc(String orderNumber, String source);

    /** Mọi đơn của 1 lượt khách, kèm khóa dòng: 2 thu ngân bấm thanh toán cùng lúc thì người sau thấy đơn đã thu. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Order> findWithLockByTableSession_IdOrderByCreatedAtAsc(Long tableSessionId);
}
