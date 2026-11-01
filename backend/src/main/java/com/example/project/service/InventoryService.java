package com.example.project.service;

import com.example.project.dto.inventory.*;
import com.example.project.entity.InventoryItem;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.StockTransaction;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.InventoryItemRepository;
import com.example.project.repository.StockReceiptRepository;
import com.example.project.repository.StockTransactionRepository;
import com.example.project.repository.UserRepository;
import com.example.project.entity.StockReceipt;
import com.example.project.entity.StockReceiptItem;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * UC-IV01 Manage Inventory Item (Manager):  tạo, sửa, xem danh sách, lọc sắp hết.
 * UC-B04  View Inventory (Barista): chỉ xem, read-only.
 */
@Service
public class InventoryService {

    private final InventoryItemRepository itemRepo;
    private final StockTransactionRepository txRepo;
    private final UserRepository userRepo;
    private final StockReceiptRepository receiptRepo;

    public InventoryService(InventoryItemRepository itemRepo,
                            StockTransactionRepository txRepo,
                            UserRepository userRepo,
                            StockReceiptRepository receiptRepo) {
        this.itemRepo = itemRepo;
        this.txRepo = txRepo;
        this.userRepo = userRepo;
        this.receiptRepo = receiptRepo;
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

    // ========== Xuất / Giảm kho (Stock Out / Adjustment / Waste) ==========

    @Transactional
    public InventoryItemView stockOut(Long id, StockOutRequest req, User currentUser) {
        InventoryItem item = findItem(id);

        if (req.quantity() == null || req.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("Số lượng giảm phải lớn hơn 0.");
        }

        if (req.quantity().compareTo(item.getCurrentQuantity()) > 0) {
            throw ApiException.badRequest("Số lượng giảm (" + req.quantity()
                    + ") không được vượt quá số lượng tồn hiện tại (" + item.getCurrentQuantity() + ").");
        }

        String type = req.reasonType() != null ? req.reasonType().trim().toUpperCase() : "ADJUSTMENT";
        String txType = switch (type) {
            case "WASTE" -> StockTransaction.WASTE;
            case "STOCK_OUT" -> StockTransaction.STOCK_OUT;
            default -> StockTransaction.ADJUSTMENT;
        };

        String defaultReason = switch (type) {
            case "WASTE" -> "Hao hụt / Hư hỏng / Hết hạn";
            case "STOCK_OUT" -> "Xuất kho sử dụng khác";
            default -> "Cân chỉnh do nhập nhầm số liệu";
        };

        StockTransaction tx = new StockTransaction();
        tx.setInventoryItem(item);
        tx.setCreatedBy(currentUser);
        tx.setTransactionType(txType);
        tx.setQuantity(req.quantity());
        tx.setReason(defaultReason);
        tx.setNote(req.note());
        txRepo.save(tx);

        item.setCurrentQuantity(item.getCurrentQuantity().subtract(req.quantity()));
        return InventoryItemView.from(item);
    }

    // ========== Báo hao hụt / Hư hỏng (Waste - UC-B06) ==========

    @Transactional
    public InventoryItemView waste(Long id, WasteReportRequest req, User currentUser) {
        InventoryItem item = findItem(id);

        if (req.quantity() == null || req.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("Số lượng báo hao hụt/hỏng phải lớn hơn 0.");
        }

        if (req.quantity().compareTo(item.getCurrentQuantity()) > 0) {
            throw ApiException.badRequest("Số lượng báo hao hụt (" + req.quantity()
                    + ") vượt quá số lượng tồn hiện tại (" + item.getCurrentQuantity() + ").");
        }

        StockTransaction tx = new StockTransaction();
        tx.setInventoryItem(item);
        tx.setCreatedBy(currentUser);
        tx.setTransactionType(StockTransaction.WASTE);
        tx.setQuantity(req.quantity());

        long unitCost = item.getUnitCost() != null ? item.getUnitCost() : 0L;
        long totalLoss = req.quantity().multiply(BigDecimal.valueOf(unitCost)).longValue();

        boolean isSubjective = "SUBJECTIVE".equalsIgnoreCase(req.causeType());
        if (isSubjective) {
            String staffName = "Chưa chỉ định";
            if (req.responsibleUserId() != null) {
                staffName = userRepo.findById(req.responsibleUserId())
                        .map(User::getFullName)
                        .orElse("ID: " + req.responsibleUserId());
            }
            int pct = req.compensationPercentage() != null ? Math.max(0, Math.min(100, req.compensationPercentage())) : 0;
            long penalty = Math.round(totalLoss * (pct / 100.0));
            String formattedNote = String.format("[BIÊN BẢN SỰ CỐ - LỖI CHỦ QUAN] Trách nhiệm: %s | Phạt: %d%% (%,d đ / Thiệt hại: %,d đ)",
                    staffName, pct, penalty, totalLoss);
            if (req.note() != null && !req.note().isBlank()) {
                formattedNote += " | Diễn giải: " + req.note().trim();
            }
            if (req.evidenceImageUrl() != null && !req.evidenceImageUrl().isBlank()) {
                formattedNote += " | Ảnh: " + req.evidenceImageUrl().trim();
            }
            tx.setReason("Sự cố hư hỏng (Lỗi chủ quan - " + staffName + ")");
            tx.setNote(formattedNote);
        } else {
            String formattedNote = "[BIÊN BẢN SỰ CỐ - KHÁCH QUAN] Quán chịu chi phí (Thiệt hại: " + String.format("%,d đ", totalLoss) + ")";
            if (req.note() != null && !req.note().isBlank()) {
                formattedNote += " | Diễn giải: " + req.note().trim();
            }
            if (req.evidenceImageUrl() != null && !req.evidenceImageUrl().isBlank()) {
                formattedNote += " | Ảnh: " + req.evidenceImageUrl().trim();
            }
            tx.setReason("Sự cố hư hỏng (Khách quan / Quán chịu)");
            tx.setNote(formattedNote);
        }
        txRepo.save(tx);

        item.setCurrentQuantity(item.getCurrentQuantity().subtract(req.quantity()));
        return InventoryItemView.from(item);
    }

    /** Lấy danh sách nhân viên đang hoạt động để Barista chọn người chịu trách nhiệm biên bản. */
    public List<StaffSelectView> listActiveStaff() {
        return userRepo.findAllByStatusOrderByFullNameAsc(User.ACTIVE)
                .stream()
                .map(u -> new StaffSelectView(
                        u.getId(),
                        u.getUsername(),
                        u.getFullName(),
                        u.getRole() != null ? u.getRole().getName() : "STAFF"
                ))
                .toList();
    }

    // ========== Lịch sử giao dịch ==========

    @Transactional(readOnly = true)
    public List<StockTransactionView> history(Long inventoryItemId) {
        return history(inventoryItemId, null);
    }

    @Transactional(readOnly = true)
    public List<StockTransactionView> history(Long inventoryItemId, LocalDate date) {
        findItem(inventoryItemId); // đảm bảo tồn tại
        if (date != null) {
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.plusDays(1).atStartOfDay();
            return txRepo.findByInventoryItem_IdAndCreatedAtBetweenOrderByCreatedAtDesc(inventoryItemId, start, end)
                    .stream().map(StockTransactionView::from).toList();
        }
        return txRepo.findByInventoryItem_IdOrderByCreatedAtDesc(inventoryItemId)
                .stream().map(StockTransactionView::from).toList();
    }

    /**
     * UC-IV01 / GBR-09: Sổ biến động kho tổng thể (Immutable ledger).
     * Cho phép lọc theo nguyên liệu (tất cả hoặc 1 món), loại biến động (ALL/STOCK_IN/STOCK_OUT/WASTE), và khoảng ngày (fromDate - toDate).
     */
    @Transactional(readOnly = true)
    public List<StockTransactionView> searchTransactions(
            Long inventoryItemId, String type, LocalDate fromDate, LocalDate toDate) {
        LocalDateTime start = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime end = toDate != null ? toDate.plusDays(1).atStartOfDay() : null;
        String txType = (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type))
                ? type.trim().toUpperCase() : null;

        return txRepo.searchTransactions(inventoryItemId, txType, start, end)
                .stream().map(StockTransactionView::from).toList();
    }

    /**
     * Tra cứu & đối soát lịch sử nhập kho của 1 nguyên liệu theo ngày đơn lẻ (Single Day View).
     */
    @Transactional(readOnly = true)
    public IngredientSingleDayReceiptHistoryView getSingleDayReceiptHistory(Long ingredientId, LocalDate date) {
        InventoryItem item = findItem(ingredientId);
        LocalDate targetDate = date != null ? date : LocalDate.now();

        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = targetDate.plusDays(1).atStartOfDay();

        List<StockReceiptItem> receiptItems = receiptRepo.findReceivedItemsByIngredientAndDate(
                ingredientId, startOfDay, endOfDay, targetDate);

        // Lấy các giao dịch STOCK_IN để đối soát "Giá vốn BQ mới"
        List<StockTransaction> inTransactions = txRepo.findByInventoryItem_IdOrderByCreatedAtDesc(ingredientId)
                .stream()
                .filter(t -> StockTransaction.STOCK_IN.equals(t.getTransactionType()))
                .toList();

        long totalCost = 0L;
        BigDecimal totalQty = BigDecimal.ZERO;
        List<IngredientReceiptDetailItemView> detailItems = new ArrayList<>();

        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        for (StockReceiptItem ri : receiptItems) {
            StockReceipt r = ri.getReceipt();
            LocalDateTime timePoint = r.getConfirmedAt() != null ? r.getConfirmedAt() : r.getCreatedAt();
            String formattedTime = timePoint != null ? timePoint.format(timeFormatter) : "--:--";

            // Tìm giá vốn BQ mới từ ghi chú thẻ kho tương ứng
            Long newAvgCost = null;
            if (inTransactions != null) {
                for (StockTransaction tx : inTransactions) {
                    if (tx.getReason() != null && tx.getReason().contains(r.getReceiptCode())) {
                        if (tx.getNote() != null && tx.getNote().contains("Giá vốn BQ mới: ")) {
                            try {
                                String part = tx.getNote().split("Giá vốn BQ mới: ")[1].split(" đ")[0].replace(",", "").trim();
                                newAvgCost = Long.parseLong(part);
                            } catch (Exception ignored) {}
                        }
                        break;
                    }
                }
            }
            if (newAvgCost == null) {
                newAvgCost = item.getUnitCost();
            }

            BigDecimal q = ri.getQuantity() != null ? ri.getQuantity() : BigDecimal.ZERO;
            Long sub = ri.getSubtotal() != null ? ri.getSubtotal() : 0L;
            totalQty = totalQty.add(q);
            totalCost += sub;

            detailItems.add(new IngredientReceiptDetailItemView(
                    r.getId(),
                    r.getReceiptCode(),
                    formattedTime,
                    r.getSupplierName(),
                    q,
                    ri.getUnitCost(),
                    sub,
                    newAvgCost,
                    r.getCreatedBy() != null ? r.getCreatedBy().getFullName() : "N/A",
                    r.getNote()
            ));
        }

        IngredientDailyReceiptSummaryView summary = new IngredientDailyReceiptSummaryView(
                detailItems.size(),
                totalQty,
                totalCost
        );

        return new IngredientSingleDayReceiptHistoryView(
                item.getId(),
                item.getItemName(),
                item.getUnit(),
                item.getCurrentQuantity(),
                targetDate,
                summary,
                detailItems
        );
    }

    // ========== Tự động trừ nguyên liệu khi Barista nhận đơn ==========

    /**
     * Tự động trừ nguyên liệu theo công thức khi Barista nhận đơn (hoặc tích hoàn thành món).
     * Kiểm tra tồn kho trước, trừ số lượng tương ứng và ghi nhận giao dịch STOCK_OUT cho từng nguyên liệu.
     */
    @Transactional
    public void deductForOrder(Order order, User barista) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }

        List<InventoryItem> activeInventory = itemRepo.findAllByStatusOrderByItemNameAsc(InventoryItem.ACTIVE);
        Map<Long, InventoryItem> invMap = activeInventory.stream()
                .collect(Collectors.toMap(InventoryItem::getId, i -> i));

        Map<Long, BigDecimal> requiredAmounts = new HashMap<>();

        for (OrderItem item : order.getItems()) {
            if (OrderItem.CANCELLED.equals(item.getItemStatus())) {
                continue;
            }
            int qty = item.getQuantity() != null ? item.getQuantity() : 1;
            MenuItem menu = item.getMenuItem();
            Map<Long, BigDecimal> itemRecipe = resolveRecipe(menu, item, activeInventory);

            for (Map.Entry<Long, BigDecimal> entry : itemRecipe.entrySet()) {
                Long invId = entry.getKey();
                BigDecimal amountPerDrink = entry.getValue();
                BigDecimal totalNeededForLine = amountPerDrink.multiply(BigDecimal.valueOf(qty));
                requiredAmounts.merge(invId, totalNeededForLine, BigDecimal::add);
            }
        }

        if (requiredAmounts.isEmpty()) {
            return;
        }

        // Bước 1: Kiểm tra đủ tồn kho cho toàn bộ nguyên liệu cần dùng
        for (Map.Entry<Long, BigDecimal> entry : requiredAmounts.entrySet()) {
            InventoryItem inv = invMap.get(entry.getKey());
            if (inv == null) continue;
            BigDecimal needed = entry.getValue();
            if (needed.compareTo(inv.getCurrentQuantity()) > 0) {
                throw ApiException.badRequest("Không đủ nguyên liệu \"" + inv.getItemName()
                        + "\" để pha chế đơn " + OrderSupportService.displayNumber(order.getOrderNumber())
                        + " (Tồn kho: " + inv.getCurrentQuantity() + " " + inv.getUnit()
                        + ", cần: " + needed + " " + inv.getUnit()
                        + "). Vui lòng báo thiếu nguyên liệu hoặc hủy món.");
            }
        }

        // Bước 2: Thực hiện trừ kho và tạo các giao dịch STOCK_OUT
        StringBuilder itemNames = new StringBuilder();
        for (OrderItem i : order.getItems()) {
            if (!OrderItem.CANCELLED.equals(i.getItemStatus())) {
                if (!itemNames.isEmpty()) itemNames.append(", ");
                itemNames.append(i.getQuantity()).append("x ").append(i.getMenuItem().getName());
            }
        }

        for (Map.Entry<Long, BigDecimal> entry : requiredAmounts.entrySet()) {
            InventoryItem inv = invMap.get(entry.getKey());
            if (inv == null) continue;
            BigDecimal needed = entry.getValue();

            inv.setCurrentQuantity(inv.getCurrentQuantity().subtract(needed));
            itemRepo.save(inv);

            StockTransaction tx = new StockTransaction();
            tx.setInventoryItem(inv);
            tx.setCreatedBy(barista);
            tx.setTransactionType(StockTransaction.STOCK_OUT);
            tx.setQuantity(needed);
            tx.setReason("Pha chế đơn #" + OrderSupportService.displayNumber(order.getOrderNumber()));
            tx.setNote("Tự động trừ khi Barista nhận đơn (" + itemNames + ")");
            txRepo.save(tx);
        }
    }

    /**
     * Xác định lượng nguyên liệu cần dùng cho 1 ly đồ uống.
     * Ưu tiên đọc recipe_ingredients của món; nếu chưa cấu hình thì dùng chuẩn định lượng mặc định theo loại đồ uống.
     */
    private Map<Long, BigDecimal> resolveRecipe(MenuItem menu, OrderItem item, List<InventoryItem> activeInventory) {
        Map<Long, BigDecimal> recipe = new HashMap<>();

        if (menu != null && menu.getRecipeIngredients() != null && !menu.getRecipeIngredients().isBlank()) {
            String[] lines = menu.getRecipeIngredients().split("[;\n]");
            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isBlank()) continue;

                Matcher m = Pattern.compile("([0-9]+(?:\\.[0-9]+)?)").matcher(line);
                BigDecimal amount = null;
                if (m.find()) {
                    try {
                        amount = new BigDecimal(m.group(1));
                    } catch (Exception ignored) {}
                }

                String lower = line.toLowerCase(Locale.ROOT);
                for (InventoryItem inv : activeInventory) {
                    if (lower.contains(inv.getItemName().toLowerCase(Locale.ROOT))) {
                        recipe.put(inv.getId(), amount != null ? amount : BigDecimal.valueOf(0.02));
                        break;
                    }
                }
            }
        }

        // Fallback định lượng chuẩn theo tên món và danh mục
        if (recipe.isEmpty() && menu != null) {
            String name = menu.getName() != null ? menu.getName().toLowerCase(Locale.ROOT) : "";
            boolean isLarge = "L".equalsIgnoreCase(item.getSizeName());

            // 1. Cà phê
            if (name.contains("cà phê") || name.contains("americano") || name.contains("latte")
                    || name.contains("cappuccino") || name.contains("bạc xỉu") || name.contains("espresso")) {
                findItemByName(activeInventory, "coffee").ifPresent(inv ->
                        recipe.put(inv.getId(), isLarge ? BigDecimal.valueOf(0.030) : BigDecimal.valueOf(0.020)));
            }

            // 2. Sữa tươi cho các món sữa / đá xay
            if (name.contains("latte") || name.contains("cappuccino") || name.contains("bạc xỉu")
                    || name.contains("sữa") || name.contains("đá xay")) {
                findItemByName(activeInventory, "milk").ifPresent(inv ->
                        recipe.put(inv.getId(), isLarge ? BigDecimal.valueOf(0.120) : BigDecimal.valueOf(0.080)));
            }

            // 3. Matcha
            if (name.contains("matcha")) {
                findItemByName(activeInventory, "matcha").ifPresent(inv ->
                        recipe.put(inv.getId(), BigDecimal.valueOf(0.020)));
            }
        }

        // Topping: Trân châu đen
        if (item != null && item.getToppingDetails() != null) {
            String toppingJson = item.getToppingDetails().toLowerCase(Locale.ROOT);
            if (toppingJson.contains("trân châu") || toppingJson.contains("tapioca")) {
                findItemByName(activeInventory, "tapioca").ifPresent(inv ->
                        recipe.merge(inv.getId(), BigDecimal.valueOf(0.050), BigDecimal::add));
            }
        }

        return recipe;
    }

    private java.util.Optional<InventoryItem> findItemByName(List<InventoryItem> items, String keyword) {
        String kw = keyword.toLowerCase(Locale.ROOT);
        return items.stream()
                .filter(i -> i.getItemName().toLowerCase(Locale.ROOT).contains(kw))
                .findFirst();
    }

    // ========== Helper ==========

    private InventoryItem findItem(Long id) {
        return itemRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nguyên liệu #" + id));
    }
}

