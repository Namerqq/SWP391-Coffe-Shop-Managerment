package com.example.project.dto.menu;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
// Cột recipe_* là TEXT (65.535 byte); utf8mb4 tối đa 4 byte/ký tự nên giới hạn 16.000 ký tự để luôn vừa cột.
public record MenuRequest(@NotBlank @Size(max=120) String name,
 @NotNull Long categoryId, @NotNull @Min(0) @Max(1000000000) Long basePrice,
 @Size(max=1000) String description, @Size(max=500) String imageUrl,
 java.util.List<@NotNull Long> allowedItemIds, ItemCustomization customization, java.util.List<@NotNull Long> allowedToppingIds,
 @Size(max=16000) String recipeIngredients, @Size(max=16000) String recipeInstructions) {
 public MenuRequest(String name, Long categoryId, Long basePrice, String description, String imageUrl,
                    java.util.List<Long> allowedItemIds, ItemCustomization customization, java.util.List<Long> allowedToppingIds) {
  this(name, categoryId, basePrice, description, imageUrl, allowedItemIds, customization, allowedToppingIds, null, null);
 }
 public MenuRequest(String name, Long categoryId, Long basePrice, String description, String imageUrl,
                    java.util.List<Long> allowedItemIds, ItemCustomization customization) {
  this(name, categoryId, basePrice, description, imageUrl, allowedItemIds, customization, null);
 }
 public MenuRequest(String name, Long categoryId, Long basePrice, String description, String imageUrl, java.util.List<Long> allowedItemIds) {
  this(name, categoryId, basePrice, description, imageUrl, allowedItemIds, null, null);
 }
 public MenuRequest(String name, Long categoryId, Long basePrice, String description, String imageUrl) {
  this(name, categoryId, basePrice, description, imageUrl, null, null, null);
 }
}
