package com.example.project.repository;

import com.example.project.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatusInOrderByCreatedAtAsc(Collection<String> statuses);
    List<Order> findByStatusAndFulfillmentTypeOrderByUpdatedAtAsc(String status, String fulfillmentType);
    List<Order> findByTableSession_IdOrderByCreatedAtAsc(Long tableSessionId);
    List<Order> findByTableSession_IdInOrderByCreatedAtAsc(Collection<Long> tableSessionIds);
    /** Các đơn đã được thu trong 1 hóa đơn (in lại hóa đơn). */
    List<Order> findByPayment_IdOrderByCreatedAtAsc(Long paymentId);
    boolean existsByTableSession_IdAndStatusNot(Long tableSessionId, String status);
    long countByOrderNumberStartingWith(String prefix);
}
