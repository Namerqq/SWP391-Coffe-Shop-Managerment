package com.example.project.service;

import com.example.project.dto.inventory.*;
import com.example.project.entity.InventoryItem;
import com.example.project.entity.StockReceipt;
import com.example.project.entity.StockReceiptItem;
import com.example.project.entity.StockTransaction;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.InventoryItemRepository;
import com.example.project.repository.StockReceiptRepository;
import com.example.project.repository.StockTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Quản lý phiếu nhập kho & yêu cầu bổ sung nguyên liệu (UC-IV02, UC-IV03, UC-IV04, UC-B05).
 */
@Service
public class StockReceiptService {

    private final StockReceiptRepository receiptRepo;
    private final InventoryItemRepository itemRepo;
    private final StockTransactionRepository txRepo;

    public StockReceiptService(StockReceiptRepository receiptRepo,
                               InventoryItemRepository itemRepo,
                               StockTransactionRepository txRepo) {
        this.receiptRepo = receiptRepo;
        this.itemRepo = itemRepo;
        this.txRepo = txRepo;
    }

    @Transactional(readOnly = true)
    public List<StockReceiptView> list(String status, String keyword) {
        String s = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status))
                ? status.trim().toUpperCase() : null;
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        return receiptRepo.search(s, kw).stream()
                .map(StockReceiptView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public StockReceiptView getById(Long id) {
        StockReceipt receipt = receiptRepo.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu nhập kho id = " + id));
        return StockReceiptView.from(receipt);
    }

    @Transactional
    public StockReceiptView createDraft(StockReceiptRequest req, User currentUser) {
        StockReceipt receipt = new StockReceipt();
        receipt.setCreatedBy(currentUser);
        receipt.setReceiptCode(generateCode("PN"));
        receipt.setSupplierName(req.supplierName().trim());
        receipt.setReceiptDate(req.receiptDate() != null ? req.receiptDate() : LocalDate.now());
        receipt.setNote(req.note());
        receipt.setStatus(StockReceipt.DRAFT);

        for (StockReceiptItemRequest itemReq : req.items()) {
            InventoryItem inv = itemRepo.findById(itemReq.inventoryItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nguyên liệu id = " + itemReq.inventoryItemId()));

            StockReceiptItem item = new StockReceiptItem();
            item.setInventoryItem(inv);
            item.setQuantity(itemReq.quantity());
            item.setUnitCost(itemReq.unitCost() != null ? itemReq.unitCost() : inv.getUnitCost());
            receipt.addItem(item);
        }

        receipt.recalcTotal();
        receiptRepo.save(receipt);
        return StockReceiptView.from(receipt);
    }

    /**
     * UC-B05: Barista báo thiếu nguyên liệu -> tạo phiếu yêu cầu bổ sung dạng DRAFT.
     */
    @Transactional
    public StockReceiptView createShortageReport(ShortageReportRequest req, User barista) {
        InventoryItem inv = itemRepo.findById(req.inventoryItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nguyên liệu id = " + req.inventoryItemId()));

        StockReceipt receipt = new StockReceipt();
        receipt.setCreatedBy(barista);
        receipt.setReceiptCode(generateCode("YC"));
        receipt.setSupplierName("Yêu cầu bổ sung (Barista: " + (barista != null ? barista.getFullName() : "N/A") + ")");
        receipt.setReceiptDate(LocalDate.now());
        receipt.setStatus(StockReceipt.DRAFT);

        String note = "Báo thiếu nguyên liệu: " + inv.getItemName()
                + " (Tồn hiện tại: " + inv.getCurrentQuantity() + " " + inv.getUnit() + ").";
        if (req.note() != null && !req.note().isBlank()) {
            note += " Ghi chú: " + req.note().trim();
        }
        receipt.setNote(note);

        StockReceiptItem item = new StockReceiptItem();
        item.setInventoryItem(inv);
        item.setQuantity(req.requestedQuantity());
        item.setUnitCost(inv.getUnitCost());
        receipt.addItem(item);

        receipt.recalcTotal();
        receiptRepo.save(receipt);
        return StockReceiptView.from(receipt);
    }

    @Transactional
    public StockReceiptView updateDraft(Long id, StockReceiptRequest req) {
        StockReceipt receipt = receiptRepo.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu nhập kho id = " + id));

        if (!StockReceipt.DRAFT.equals(receipt.getStatus())) {
            throw ApiException.badRequest("Chỉ có thể chỉnh sửa phiếu ở trạng thái Nháp (DRAFT).");
        }

        receipt.setSupplierName(req.supplierName().trim());
        receipt.setReceiptDate(req.receiptDate() != null ? req.receiptDate() : LocalDate.now());
        receipt.setNote(req.note());

        receipt.clearItems();
        for (StockReceiptItemRequest itemReq : req.items()) {
            InventoryItem inv = itemRepo.findById(itemReq.inventoryItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nguyên liệu id = " + itemReq.inventoryItemId()));

            StockReceiptItem item = new StockReceiptItem();
            item.setInventoryItem(inv);
            item.setQuantity(itemReq.quantity());
            item.setUnitCost(itemReq.unitCost() != null ? itemReq.unitCost() : inv.getUnitCost());
            receipt.addItem(item);
        }

        receipt.recalcTotal();
        receiptRepo.save(receipt);
        return StockReceiptView.from(receipt);
    }

    /**
     * UC-IV02: Xác nhận nhập kho -> chuyển sang RECEIVED, tăng số lượng tồn và ghi lịch sử STOCK_IN.
     */
    @Transactional
    public StockReceiptView confirmReceipt(Long id, User currentUser) {
        StockReceipt receipt = receiptRepo.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu nhập kho id = " + id));

        if (!StockReceipt.DRAFT.equals(receipt.getStatus())) {
            throw ApiException.badRequest("Phiếu nhập đã được xác nhận hoặc đã bị hủy trước đó.");
        }

        receipt.setStatus(StockReceipt.RECEIVED);
        receipt.setConfirmedAt(LocalDateTime.now());

        for (StockReceiptItem item : receipt.getItems()) {
            InventoryItem inv = item.getInventoryItem();

            // Tăng số lượng tồn kho
            inv.setCurrentQuantity(inv.getCurrentQuantity().add(item.getQuantity()));
            if (item.getUnitCost() != null && item.getUnitCost() > 0) {
                inv.setUnitCost(item.getUnitCost());
            }
            itemRepo.save(inv);

            // Ghi nhận lịch sử biến động kho
            StockTransaction tx = new StockTransaction();
            tx.setInventoryItem(inv);
            tx.setCreatedBy(currentUser != null ? currentUser : receipt.getCreatedBy());
            tx.setTransactionType(StockTransaction.STOCK_IN);
            tx.setQuantity(item.getQuantity());
            tx.setReason("Nhập kho theo phiếu " + receipt.getReceiptCode());
            tx.setNote("Nhà cung cấp: " + receipt.getSupplierName());
            txRepo.save(tx);
        }

        receiptRepo.save(receipt);
        return StockReceiptView.from(receipt);
    }

    /**
     * Hủy phiếu nhập kho / từ chối yêu cầu bổ sung.
     */
    @Transactional
    public StockReceiptView cancelReceipt(Long id, String reason) {
        StockReceipt receipt = receiptRepo.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu nhập kho id = " + id));

        if (!StockReceipt.DRAFT.equals(receipt.getStatus())) {
            throw ApiException.badRequest("Chỉ có thể hủy phiếu ở trạng thái Nháp (DRAFT).");
        }

        receipt.setStatus(StockReceipt.CANCELLED);
        if (reason != null && !reason.isBlank()) {
            String existingNote = receipt.getNote() != null ? receipt.getNote() + " | " : "";
            receipt.setNote(existingNote + "Lý do hủy: " + reason.trim());
        }

        receiptRepo.save(receipt);
        return StockReceiptView.from(receipt);
    }

    private String generateCode(String prefix) {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String code;
        do {
            int randomNum = ThreadLocalRandom.current().nextInt(100, 1000);
            code = String.format("%s-%s-%03d", prefix, datePart, randomNum);
        } while (receiptRepo.existsByReceiptCode(code));
        return code;
    }
}
