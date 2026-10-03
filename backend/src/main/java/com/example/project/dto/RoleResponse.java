package com.example.project.dto;

import com.example.project.entity.Role;

public record RoleResponse(Long id, String name, String description) {
    public static RoleResponse from(Role r) {
        return new RoleResponse(r.getId(), r.getName(), r.getDescription());
    }
}
