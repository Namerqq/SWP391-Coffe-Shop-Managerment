package com.example.project.dto.delivery;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body của PUT /api/waiter/deliveries/{orderId}/fail: { "reason": "Khách không nghe máy" } */
public record FailDeliveryRequest(
        @NotBlank(message = "Vui lòng nhập lý do giao không thành công.")
        @Size(max = 400, message = "Lý do tối đa 400 ký tự.") String reason) {}
