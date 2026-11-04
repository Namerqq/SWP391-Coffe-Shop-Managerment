package com.example.project.dto.barista;

import jakarta.validation.constraints.Min;

/**
 * Hủy món vì hết nguyên liệu. Body (không bắt buộc): { "quantity": 1 }.
 * quantity = số ly cần hủy trong dòng (vd hủy 1 trong 2× Americano); bỏ trống = hủy cả dòng.
 */
public record ItemCancelRequest(@Min(value = 1, message = "Số ly cần hủy tối thiểu là 1") Integer quantity) {}
