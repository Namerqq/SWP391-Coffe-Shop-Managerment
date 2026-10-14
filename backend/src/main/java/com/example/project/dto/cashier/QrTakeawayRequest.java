package com.example.project.dto.cashier;

import com.example.project.dto.order.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Tạo mã QR payOS cho đơn mang đi. Đơn CHƯA được tạo: khách trả xong hệ thống mới tạo đơn và gửi pha chế. */
public record QrTakeawayRequest(
        @NotEmpty(message = "Chưa chọn món nào") List<@Valid OrderItemRequest> items,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,
        Long customerId,
        @Min(value = 0, message = "Số điểm dùng không hợp lệ") Integer pointsToRedeem
) {}
