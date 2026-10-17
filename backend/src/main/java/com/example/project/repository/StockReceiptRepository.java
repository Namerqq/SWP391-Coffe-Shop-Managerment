package com.example.project.repository;

import com.example.project.entity.StockReceipt;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockReceiptRepository extends JpaRepository<StockReceipt, Long> {

    @EntityGraph(attributePaths = {"createdBy"})
    List<StockReceipt> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"createdBy"})
    List<StockReceipt> findByStatusOrderByCreatedAtDesc(String status);

    @EntityGraph(attributePaths = {"createdBy", "items", "items.inventoryItem"})
    Optional<StockReceipt> findWithDetailsById(Long id);

    boolean existsByReceiptCode(String receiptCode);

    @Query("SELECT r FROM StockReceipt r WHERE " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:keyword IS NULL OR LOWER(r.receiptCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.supplierName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY r.createdAt DESC")
    @EntityGraph(attributePaths = {"createdBy"})
    List<StockReceipt> search(@Param("status") String status, @Param("keyword") String keyword);
}
