package com.example.project.dto.barista;

/** Công thức 1 món (lấy từ menu_items.recipe_ingredients / recipe_instructions). */
public record RecipeView(Long menuItemId, String name, String ingredients, String instructions) {}
