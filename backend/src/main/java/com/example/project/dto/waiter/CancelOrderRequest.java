package com.example.project.dto.waiter;

import jakarta.validation.constraints.Size;

/** Lý do hủy đơn. Phục vụ: không bắt buộc. Pha chế (hết nguyên liệu): bắt buộc. */
public record CancelOrderRequest(@Size(max = 300, message = "Lý do tối đa 300 ký tự") String reason) {}
