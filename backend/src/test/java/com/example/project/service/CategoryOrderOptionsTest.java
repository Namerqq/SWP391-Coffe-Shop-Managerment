package com.example.project.service;

import com.example.project.dto.menu.ItemCustomization;
import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import com.example.project.entity.SystemSetting;
import com.example.project.exception.ApiException;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.SystemSettingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CategoryOrderOptionsTest {
    private final SystemSettingRepository settings = mock(SystemSettingRepository.class);
    private final MenuItemRepository items = mock(MenuItemRepository.class);
    private final ItemCustomizationService customization = new ItemCustomizationService(settings, new ObjectMapper());
    private final ToppingCompatibilityService toppings = new ToppingCompatibilityService(settings, items);

    private MenuItem item(String type) {
        Category category = new Category();
        ReflectionTestUtils.setField(category, "id", 1L);
        category.setCategoryType(type);
        MenuItem item = new MenuItem();
        ReflectionTestUtils.setField(item, "id", 2L);
        item.setCategory(category);
        when(items.findById(2L)).thenReturn(Optional.of(item));
        return item;
    }

    private void enabled(boolean enabled) {
        SystemSetting row = SystemSetting.categoryOptions(ItemCustomizationService.CATEGORY_PREFIX + 1L);
        row.setValue(String.valueOf(enabled));
        when(settings.findById(row.getKey())).thenReturn(Optional.of(row));
    }

    @Test
    void oldFoodHasNoSizeSugarOrIceDespiteSavedItemOptions() throws Exception {
        MenuItem food = item("FOOD");
        SystemSetting row = SystemSetting.itemCustomization(ItemCustomizationService.PREFIX + 2L);
        row.setValue(new ObjectMapper().writeValueAsString(
                new ItemCustomization(List.of("S"), "S", List.of("100%"), "100%", List.of("50%"), "50%", false)));
        when(settings.findById(row.getKey())).thenReturn(Optional.of(row));
        var config = customization.get(food);
        assertTrue(config.sizes().isEmpty());
        assertTrue(config.sugarLevels().isEmpty());
        assertTrue(config.iceLevels().isEmpty());
        assertThrows(ApiException.class, () ->
                ItemCustomizationService.select("50%", config.iceLevels(), config.defaultIce(), "đá"));
    }

    @Test
    void managerCanEnableFoodAndDisableDrinks() {
        MenuItem food = item("FOOD");
        enabled(true);
        assertFalse(customization.get(food).sizes().isEmpty());
        MenuItem drink = item("DRINK");
        enabled(false);
        assertTrue(customization.get(drink).sizes().isEmpty());
    }

    @Test
    void disabledCategoryRejectsPreviouslyAssignedTopping() {
        item("FOOD");
        SystemSetting rule = SystemSetting.menuRule("menu.topping.3.item.2");
        when(settings.findById(rule.getKey())).thenReturn(Optional.of(rule));
        assertFalse(toppings.allows(3L, 2L));
        enabled(true);
        assertTrue(toppings.allows(3L, 2L));
    }

    @Test
    void disabledCategoryIsExcludedFromPublicToppingRules() {
        MenuItem food = item("FOOD");
        when(items.findAll()).thenReturn(List.of(food));
        when(settings.findByKeyStartingWith(ToppingCompatibilityService.PREFIX))
                .thenReturn(List.of(SystemSetting.menuRule("menu.topping.3.item.2")));
        assertTrue(toppings.rules().get(3L).isEmpty());
        enabled(true);
        assertEquals(List.of(2L), toppings.rules().get(3L));
    }

    @Test
    void toppingCategoryCannotEnableOptions() {
        MenuItem topping = item("TOPPING");
        enabled(true);
        assertTrue(customization.get(topping).sizes().isEmpty());
        assertFalse(customization.categoryEnabled(topping.getCategory()));
    }
}
