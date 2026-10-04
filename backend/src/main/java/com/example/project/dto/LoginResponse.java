package com.example.project.dto;

public record LoginResponse(String token, long expiresInMinutes, UserResponse user) {}
