package com.example.project.repository;

import com.example.project.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    /** Tìm thông tin giao hàng theo orderId (mỗi đơn giao hàng có tối đa 1 dòng delivery). */
    Optional<Delivery> findByOrder_Id(Long orderId);

    /** Các đơn 1 phục vụ đang cầm (theo trạng thái giao), cũ nhất lên đầu: dùng cho màn Đơn của tôi. */
    List<Delivery> findByAssignedWaiter_IdAndDeliveryStatusInOrderByAssignedAtAsc(Long waiterId, Collection<String> statuses);

    /** Số đơn 1 phục vụ đang cầm, để thu ngân chia đều khi gán. */
    long countByAssignedWaiter_IdAndDeliveryStatusIn(Long waiterId, Collection<String> statuses);
}
