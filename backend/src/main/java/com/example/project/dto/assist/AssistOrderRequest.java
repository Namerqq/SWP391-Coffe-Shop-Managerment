package com.example.project.dto.assist;

import com.example.project.dto.order.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Phục vụ gọi món giúp khách tại 1 bàn. */
public record AssistOrderRequest(
        @NotNull(message = "Vui lòng chọn bàn") Long tableId,
        @NotEmpty(message = "Chưa chọn món nào") @Size(max = 30, message = "Mỗi đơn tối đa 30 dòng món")
        List<@Valid OrderItemRequest> items,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note
) {}
