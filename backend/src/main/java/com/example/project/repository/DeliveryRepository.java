package com.example.project.repository;

import com.example.project.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    /** Tìm thông tin giao hàng theo orderId (mỗi đơn giao hàng có tối đa 1 dòng delivery). */
    Optional<Delivery> findByOrder_Id(Long orderId);
}
