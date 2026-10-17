package com.example.project.dto.menu;
import jakarta.validation.constraints.*;
public record MenuRequest(@NotBlank @Size(max=120) String name,
 @NotNull Long categoryId, @NotNull @Min(0) @Max(1000000000) Long basePrice,
 @Size(max=1000) String description, @Size(max=500) String imageUrl) {}
