package com.example.project.dto;

import com.example.project.entity.enums.MenuItemStatus;
import jakarta.validation.constraints.NotNull;

/** UC-DM02: AVAILABLE (còn bán) / UNAVAILABLE (tạm hết). INACTIVE dùng API xóa/khôi phục. */
public record AvailabilityRequest(@NotNull(message = "Trạng thái không được để trống") MenuItemStatus availabilityStatus) {}
