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

    @Query("SELECT i FROM StockReceiptItem i " +
           "JOIN FETCH i.receipt r " +
           "JOIN FETCH r.createdBy u " +
           "JOIN FETCH i.inventoryItem inv " +
           "WHERE inv.id = :itemId " +
           "AND r.status = 'RECEIVED' " +
           "AND (" +
           "  (r.confirmedAt IS NOT NULL AND r.confirmedAt >= :startOfDay AND r.confirmedAt < :endOfDay) " +
           "  OR (r.confirmedAt IS NULL AND r.receiptDate = :targetDate)" +
           ") " +
           "ORDER BY COALESCE(r.confirmedAt, r.createdAt) DESC")
    List<com.example.project.entity.StockReceiptItem> findReceivedItemsByIngredientAndDate(
            @Param("itemId") Long itemId,
            @Param("startOfDay") java.time.LocalDateTime startOfDay,
            @Param("endOfDay") java.time.LocalDateTime endOfDay,
            @Param("targetDate") java.time.LocalDate targetDate);
}
