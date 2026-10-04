package com.example.project.service;

import com.example.project.dto.inventory.*;
import com.example.project.entity.InventoryItem;
import com.example.project.entity.StockTransaction;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.InventoryItemRepository;
import com.example.project.repository.StockTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * UC-IV01 Manage Inventory Item (Manager):  tạo, sửa, xem danh sách, lọc sắp hết.
 * UC-B04  View Inventory (Barista): chỉ xem, read-only.
 */
@Service
public class InventoryService {

    private final InventoryItemRepository itemRepo;
    private final StockTransactionRepository txRepo;

    public InventoryService(InventoryItemRepository itemRepo, StockTransactionRepository txRepo) {
        this.itemRepo = itemRepo;
        this.txRepo = txRepo;
    }

    // ========== Danh sách ==========

    /** Lấy tất cả nguyên liệu đang hoạt động. */
    public List<InventoryItemView> listActive() {
        return itemRepo.findAllByStatusOrderByItemNameAsc(InventoryItem.ACTIVE)
                .stream().map(InventoryItemView::from).toList();
    }

    /** Lấy nguyên liệu đang hoạt động có mức tồn thấp. */
    public List<InventoryItemView> listLowStock() {
        return itemRepo.findLowStock(InventoryItem.ACTIVE)
                .stream().map(InventoryItemView::from).toList();
    }

    /** Thống kê tổng quan kho. */
    public Map<String, Object> stats() {
        List<InventoryItem> all = itemRepo.findAllByStatusOrderByItemNameAsc(InventoryItem.ACTIVE);
        long total = all.size();
        long lowStock = all.stream().filter(InventoryItem::isLowStock).count();
        long ok = total - lowStock;
        return Map.of("total", total, "lowStock", lowStock, "ok", ok);
    }

    // ========== Chi tiết ==========

    public InventoryItemView getById(Long id) {
        return InventoryItemView.from(findItem(id));
    }

    // ========== Tạo mới ==========

    @Transactional
    public InventoryItemView create(InventoryItemRequest req, User currentUser) {
        if (itemRepo.existsByItemNameIgnoreCase(req.itemName())) {
            throw ApiException.conflict("Nguyên liệu \"" + req.itemName() + "\" đã tồn tại.");
        }

        InventoryItem item = new InventoryItem();
        item.setItemName(req.itemName().trim());
        item.setUnit(req.unit().trim());
        item.setMinimumStockLevel(req.minimumStockLevel());
        item.setUnitCost(req.unitCost());

        BigDecimal opening = req.openingQuantity() != null ? req.openingQuantity() : BigDecimal.ZERO;
        item.setCurrentQuantity(opening);
        itemRepo.save(item);

        // Tạo giao dịch INITIAL nếu có số lượng ban đầu > 0
        if (opening.compareTo(BigDecimal.ZERO) > 0) {
            StockTransaction tx = new StockTransaction();
            tx.setInventoryItem(item);
            tx.setCreatedBy(currentUser);
            tx.setTransactionType(StockTransaction.INITIAL);
            tx.setQuantity(opening);
            tx.setReason("Nhập tồn đầu khi tạo nguyên liệu");
            txRepo.save(tx);
        }

        return InventoryItemView.from(item);
    }

    // ========== Cập nhật ==========

    @Transactional
    public InventoryItemView update(Long id, InventoryItemRequest req) {
        InventoryItem item = findItem(id);

        // Kiểm tra trùng tên (trừ chính nó)
        itemRepo.findByItemNameIgnoreCase(req.itemName().trim())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw ApiException.conflict("Nguyên liệu \"" + req.itemName() + "\" đã tồn tại.");
                });

        item.setItemName(req.itemName().trim());
        item.setUnit(req.unit().trim());
        item.setMinimumStockLevel(req.minimumStockLevel());
        item.setUnitCost(req.unitCost());
        // Không thay đổi currentQuantity khi sửa — chỉ thay đổi qua nhập kho / xuất kho.
        return InventoryItemView.from(item);
    }

    // ========== Nhập kho (Stock In) ==========

    @Transactional
    public InventoryItemView stockIn(Long id, StockInRequest req, User currentUser) {
        InventoryItem item = findItem(id);

        StockTransaction tx = new StockTransaction();
        tx.setInventoryItem(item);
        tx.setCreatedBy(currentUser);
        tx.setTransactionType(StockTransaction.STOCK_IN);
        tx.setQuantity(req.quantity());
        tx.setReason("Nhập kho");
        tx.setNote(req.note());
        txRepo.save(tx);

        item.setCurrentQuantity(item.getCurrentQuantity().add(req.quantity()));
        return InventoryItemView.from(item);
    }

    // ========== Lịch sử giao dịch ==========

    public List<StockTransactionView> history(Long inventoryItemId) {
        findItem(inventoryItemId); // đảm bảo tồn tại
        return txRepo.findByInventoryItem_IdOrderByCreatedAtDesc(inventoryItemId)
                .stream().map(StockTransactionView::from).toList();
    }

    // ========== Helper ==========

    private InventoryItem findItem(Long id) {
        return itemRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nguyên liệu #" + id));
    }
}
