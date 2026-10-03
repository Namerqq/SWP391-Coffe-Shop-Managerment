package com.example.project.dto;

import jakarta.validation.constraints.NotNull;

public record RoleAssignRequest(@NotNull(message = "Vui lòng chọn vai trò") Long roleId) {}
