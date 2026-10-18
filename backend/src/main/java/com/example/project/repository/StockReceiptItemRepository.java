package com.example.project.repository;

import com.example.project.entity.StockReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockReceiptItemRepository extends JpaRepository<StockReceiptItem, Long> {

    List<StockReceiptItem> findByReceipt_Id(Long receiptId);
}
