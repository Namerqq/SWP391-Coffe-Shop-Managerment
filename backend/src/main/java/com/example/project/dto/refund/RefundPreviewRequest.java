package com.example.project.dto.refund;

import java.util.List;

/** Xem trước số tiền hoàn: đơn tại quầy đã thanh toán + các món muốn hoàn. */
public record RefundPreviewRequest(Long orderId, List<Long> itemIds) {}
