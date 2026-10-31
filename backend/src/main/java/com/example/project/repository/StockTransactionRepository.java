package com.example.project.repository;

import com.example.project.entity.StockTransaction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {

    @EntityGraph(attributePaths = {"inventoryItem", "createdBy"})
    List<StockTransaction> findByInventoryItem_IdOrderByCreatedAtDesc(Long inventoryItemId);

    @EntityGraph(attributePaths = {"inventoryItem", "createdBy"})
    List<StockTransaction> findByInventoryItem_IdAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long inventoryItemId, LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = {"inventoryItem", "createdBy"})
    @Query("SELECT t FROM StockTransaction t "
            + "WHERE (:itemId IS NULL OR t.inventoryItem.id = :itemId) "
            + "AND (:type IS NULL OR t.transactionType = :type) "
            + "AND (:from IS NULL OR t.createdAt >= :from) "
            + "AND (:to IS NULL OR t.createdAt < :to) "
            + "ORDER BY t.createdAt DESC")
    List<StockTransaction> searchTransactions(
            @Param("itemId") Long itemId,
            @Param("type") String type,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
