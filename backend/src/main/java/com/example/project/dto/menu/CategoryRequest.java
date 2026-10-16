package com.example.project.dto.menu;
import jakarta.validation.constraints.*;
public record CategoryRequest(@NotBlank @Size(max=80) String name,
 @NotBlank @Pattern(regexp="DRINK|FOOD|TOPPING") String categoryType) {}
