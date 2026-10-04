package com.example.project.repository;

import com.example.project.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    long countByPaymentCodeStartingWith(String prefix);
    boolean existsByOrder_IdAndPaymentStatus(Long orderId, String paymentStatus);
}
