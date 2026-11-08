package com.example.project.service;

import com.example.project.dto.menu.MenuRequest;
import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import com.example.project.exception.ApiException;
import com.example.project.repository.CategoryRepository;
import com.example.project.repository.MenuItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MenuItemRestoreTest {
    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final MenuItemRepository items = mock(MenuItemRepository.class);
    private final ToppingCompatibilityService toppings = mock(ToppingCompatibilityService.class);
    private final ItemCustomizationService customizations = mock(ItemCustomizationService.class);
    private final MenuManagementService service = new MenuManagementService(categories, items, toppings);
    private final Category category = new Category();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "customizations", customizations);
        ReflectionTestUtils.setField(category, "id", 1L);
        category.setCategoryType("DRINK");
        category.setStatus(Category.ACTIVE);
        when(categories.findById(1L)).thenReturn(Optional.of(category));
        when(items.save(any(MenuItem.class))).thenAnswer(call -> call.getArgument(0));
    }

    private MenuItem existing(String status) {
        MenuItem item = new MenuItem();
        ReflectionTestUtils.setField(item, "id", 10L);
        item.setName("Americano");
        item.setCategory(category);
        item.setAvailabilityStatus(status);
        item.setBasePrice(32000L);
        when(items.findAll()).thenReturn(List.of(item));
        when(items.findById(10L)).thenReturn(Optional.of(item));
        return item;
    }

    @Test
    void addingDeletedNameRestoresSameIdWithNewDetails() {
        MenuItem deleted = existing(MenuItem.INACTIVE);
        var result = service.saveItem(null, new MenuRequest(" americano ", 1L, 35000L, "Mới", null));
        assertEquals(10L, result.id());
        assertEquals(MenuItem.AVAILABLE, deleted.getAvailabilityStatus());
        assertEquals(35000L, deleted.getBasePrice());
        assertEquals("Mới", deleted.getDescription());
        verify(items).save(deleted);
    }

    @Test
    void availableAndUnavailableNamesStillConflict() {
        for (String status : List.of(MenuItem.AVAILABLE, MenuItem.UNAVAILABLE)) {
            existing(status);
            assertThrows(ApiException.class, () ->
                    service.saveItem(null, new MenuRequest("Americano", 1L, 35000L, null, null)));
        }
        verify(items, never()).save(any());
    }

    @Test
    void editingUnavailableItemKeepsItsAvailability() {
        MenuItem item = existing(MenuItem.UNAVAILABLE);
        service.saveItem(10L, new MenuRequest("Americano", 1L, 35000L, null, null));
        assertEquals(MenuItem.UNAVAILABLE, item.getAvailabilityStatus());
    }
}
