package com.example.project.dto.order;

import java.time.LocalDateTime;

/**
 * 1 ô trên sơ đồ bàn (Phục vụ + Thu ngân). sessionId = null nghĩa là bàn trống.
 * Số đơn chỉ tính đơn chưa hủy. unfinishedCount = chờ pha + đang pha + chờ mang ra.
 * unpaidCount / unpaidTotal = số đơn / số tiền chưa thanh toán (song song với tiến trình phục vụ).
 */
public record TableBoardItem(
        Long tableId, String tableNumber, Long sessionId, String sessionCode, LocalDateTime openedAt,
        int orderCount, int waitingCount, int preparingCount, int readyCount, int servedCount,
        int unfinishedCount, long total, int unpaidCount, long unpaidTotal
) {}
