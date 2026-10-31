package com.example.project.service;

import com.example.project.dto.inventory.InventoryItemView;
import com.example.project.entity.InventoryItem;
import com.example.project.repository.InventoryItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * SRS Background Job #1: Low Stock Checking Job (UC-IV03 View Low Stock Alert).
 * Định kỳ quét các nguyên liệu có current_quantity <= minimum_stock_level để tạo cảnh báo
 * hiển thị trên dashboard và ghi nhận log phục vụ đối soát.
 */
@Service
public class LowStockCheckingJob {

    private static final Logger log = LoggerFactory.getLogger(LowStockCheckingJob.class);

    private final InventoryItemRepository itemRepo;

    /** Snapshot lưu kết quả lần quét gần nhất để phục vụ Dashboard hoặc alert banner */
    private final AtomicReference<LowStockSnapshot> latestSnapshot = new AtomicReference<>(
            new LowStockSnapshot(LocalDateTime.now(), 0, List.of())
    );

    public LowStockCheckingJob(InventoryItemRepository itemRepo) {
        this.itemRepo = itemRepo;
    }

    /**
     * Chạy định kỳ theo cấu hình (mặc định sau khi khởi động 10 giây và lặp lại mỗi 60 giây).
     */
    @Scheduled(
            initialDelayString = "${app.inventory.low-stock-job.initial-delay-ms:10000}",
            fixedDelayString = "${app.inventory.low-stock-job.interval-ms:60000}"
    )
    @Transactional(readOnly = true)
    public void executeJob() {
        checkLowStock();
    }

    /**
     * Logic quét và đánh giá tồn kho tối thiểu (SRS Background Job #1).
     * Có thể gọi thủ công từ service/controller khác hoặc unit test.
     */
    @Transactional(readOnly = true)
    public LowStockSnapshot checkLowStock() {
        LocalDateTime now = LocalDateTime.now();
        List<InventoryItem> lowStockEntities = itemRepo.findLowStock(InventoryItem.ACTIVE);

        List<InventoryItemView> views = lowStockEntities.stream()
                .map(InventoryItemView::from)
                .toList();

        LowStockSnapshot snapshot = new LowStockSnapshot(now, views.size(), views);
        latestSnapshot.set(snapshot);

        if (views.isEmpty()) {
            log.info("[SRS Background Job #1] Quét tồn kho hoàn tất lúc {}: Tất cả nguyên liệu đều ở mức an toàn.", now);
        } else {
            log.warn("[SRS Background Job #1] CẢNH BÁO: Phát hiện {} nguyên liệu chạm hoặc dưới ngưỡng tối thiểu (UC-IV03):", views.size());
            for (InventoryItemView item : views) {
                log.warn("  -> Nguyên liệu: '{}' (ID: {}) - Tồn: {} {} <= Định mức tối thiểu: {} {}",
                        item.itemName(),
                        item.id(),
                        item.currentQuantity(),
                        item.unit(),
                        item.minimumStockLevel(),
                        item.unit());
            }
        }

        return snapshot;
    }

    /**
     * Lấy kết quả snapshot của lần kiểm tra gần nhất mà không cần query lại database.
     */
    public LowStockSnapshot getLatestSnapshot() {
        return latestSnapshot.get();
    }

    /** Record chứa kết quả snapshot lần quét cảnh báo */
    public record LowStockSnapshot(
            LocalDateTime checkedAt,
            int totalAlertCount,
            List<InventoryItemView> lowStockItems
    ) {}
}
