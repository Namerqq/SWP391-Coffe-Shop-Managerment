package com.example.project.dto;

import com.example.project.entity.enums.CategoryStatus;
import jakarta.validation.constraints.NotNull;

public record CategoryStatusRequest(@NotNull(message = "Trạng thái không được để trống") CategoryStatus status) {}
