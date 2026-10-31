package com.example.project.dto.refund;

import jakarta.validation.constraints.Size;

/** Lý do hủy / hoàn tiền đơn online. */
public record RefundReasonRequest(@Size(max = 200, message = "Lý do tối đa 200 ký tự") String reason) {}
