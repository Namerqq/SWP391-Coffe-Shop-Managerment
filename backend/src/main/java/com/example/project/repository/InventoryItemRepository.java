package com.example.project.repository;

import com.example.project.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    List<InventoryItem> findAllByStatusOrderByItemNameAsc(String status);

    Optional<InventoryItem> findByItemNameIgnoreCase(String itemName);

    boolean existsByItemNameIgnoreCase(String itemName);


    /** Dùng query JPQL vì Spring Data không support so sánh 2 cột trực tiếp. */
    @org.springframework.data.jpa.repository.Query(
        "SELECT i FROM InventoryItem i WHERE i.status = :status AND i.currentQuantity <= i.minimumStockLevel ORDER BY i.itemName"
    )
    List<InventoryItem> findLowStock(@org.springframework.data.repository.query.Param("status") String status);

    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(i) FROM InventoryItem i WHERE i.status = :status AND i.currentQuantity <= i.minimumStockLevel"
    )
    long countLowStock(@org.springframework.data.repository.query.Param("status") String status);
}
