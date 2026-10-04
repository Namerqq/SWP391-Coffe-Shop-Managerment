package com.example.project.dto.guest;

import jakarta.validation.constraints.Size;

/** Lý do khách hủy đơn (không bắt buộc). */
public record GuestCancelRequest(@Size(max = 300, message = "Lý do tối đa 300 ký tự") String reason) {}
