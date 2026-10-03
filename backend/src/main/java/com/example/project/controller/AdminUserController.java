package com.example.project.controller;

import com.example.project.dto.*;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Chỉ ADMIN gọi được (AuthInterceptor chặn /api/admin/**). */
@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    private final UserService service;

    public AdminUserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/roles")
    public List<RoleResponse> roles() {
        return service.getRoles();
    }

    @GetMapping("/users")
    public List<UserResponse> list(@RequestParam(required = false) String keyword,
                                   @RequestParam(required = false) Long roleId,
                                   @RequestParam(required = false) String status) {
        return service.search(keyword, roleId, status);
    }

    @GetMapping("/users/{id}")
    public UserResponse detail(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping("/users")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/users/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest req,
                               HttpServletRequest request) {
        return service.update(id, req, AuthInterceptor.extractToken(request));
    }

    @PatchMapping("/users/{id}/role")
    public UserResponse assignRole(@PathVariable Long id, @Valid @RequestBody RoleAssignRequest req,
                                   @RequestAttribute(AuthInterceptor.CURRENT_USER) User currentUser) {
        return service.assignRole(id, req.roleId(), currentUser);
    }

    @PatchMapping("/users/{id}/status")
    public UserResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest req,
                                     @RequestAttribute(AuthInterceptor.CURRENT_USER) User currentUser) {
        return service.updateStatus(id, req.status(), currentUser);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @RequestAttribute(AuthInterceptor.CURRENT_USER) User currentUser) {
        service.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
