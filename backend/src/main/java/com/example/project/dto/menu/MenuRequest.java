package com.example.project.dto.menu;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public record MenuRequest(@NotBlank @Size(max=120) String name,
 @NotNull Long categoryId, @NotNull @Min(0) @Max(1000000000) Long basePrice,
 @Size(max=1000) String description, @Size(max=500) String imageUrl,
 java.util.List<@NotNull Long> allowedItemIds) {
 public MenuRequest(String name, Long categoryId, Long basePrice, String description, String imageUrl) {
  this(name, categoryId, basePrice, description, imageUrl, null);
 }
}
