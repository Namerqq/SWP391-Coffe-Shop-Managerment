package com.example.project.controller;

import com.example.project.dto.LoginRequest;
import com.example.project.dto.LoginResponse;
import com.example.project.dto.UserResponse;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return service.login(req);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        service.logout(AuthInterceptor.extractToken(request));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserResponse me(@RequestAttribute(AuthInterceptor.CURRENT_USER) User currentUser) {
        return UserResponse.from(currentUser);
    }
}
