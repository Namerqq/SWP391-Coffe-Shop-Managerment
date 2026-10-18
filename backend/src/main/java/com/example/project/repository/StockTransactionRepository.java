package com.example.project.repository;

import com.example.project.entity.StockTransaction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {

    @EntityGraph(attributePaths = {"inventoryItem", "createdBy"})
    List<StockTransaction> findByInventoryItem_IdOrderByCreatedAtDesc(Long inventoryItemId);
}
