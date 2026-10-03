package com.example.project.dto;

import com.example.project.entity.User;
import java.time.LocalDateTime;

/** DTO trả về cho frontend. KHÔNG bao giờ trả password_hash. */
public record UserResponse(
        Long id,
        String fullName,
        String username,
        String email,
        String status,
        Long roleId,
        String roleName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getUsername(), u.getEmail(), u.getStatus(),
                u.getRole().getId(), u.getRole().getName(), u.getCreatedAt(), u.getUpdatedAt());
    }
}
