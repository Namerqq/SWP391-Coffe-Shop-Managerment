package com.example.project.dto.inventory;

public record StaffSelectView(
        Long userId,
        String username,
        String fullName,
        String roleName
) {}
