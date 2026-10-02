package com.example.project.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** Khách gửi đơn: mã QR của bàn + danh sách món. */
public record PlaceOrderRequest(
        @NotBlank(message = "Thiếu mã QR bàn") String qrCode,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String customerNote,
        @NotEmpty(message = "Giỏ hàng đang trống") @Size(max = 30, message = "Tối đa 30 dòng món / đơn") @Valid List<OrderItemRequest> items
) {}
