package com.example.project.dto.delivery;

/** 1 phục vụ trong ô chọn người giao của thu ngân, kèm số đơn đang cầm để chia đều. */
public record WaiterOptionView(Long id, String fullName, long holdingCount) {}
