package com.example.project.service;

import com.example.project.dto.order.OrderItemRequest;
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

class FoodCustomizationTest {
    SystemSettingRepository settings = mock(SystemSettingRepository.class);
    ItemCustomizationService service = new ItemCustomizationService(settings, new ObjectMapper());
    MenuItem item(String type) {
        Category category = new Category(); category.setCategoryType(type); category.setStatus(Category.ACTIVE);
        MenuItem item = new MenuItem(); item.setCategory(category); item.setName("Test item");
        item.setBasePrice(35000L); item.setAvailabilityStatus(MenuItem.AVAILABLE); item.setSellStandalone(true);
        ReflectionTestUtils.setField(item,"id",1L); return item;
    }
    @Test void foodAndToppingNeverExposeDrinkOptions() {
        for (String type : List.of("FOOD", "TOPPING")) {
            var config = service.get(item(type));
            assertTrue(config.sizes().isEmpty()); assertTrue(config.sugarLevels().isEmpty());
            assertTrue(config.iceLevels().isEmpty()); assertNull(config.defaultSize());
            assertNull(config.defaultSugar()); assertNull(config.defaultIce());
        }
        verifyNoInteractions(settings); // cấu hình cũ trong DB không bật lại lựa chọn của bánh
    }
    @Test void savingFoodRemovesOldDrinkConfiguration() {
        var row = SystemSetting.itemCustomization("menu.customization.1");
        when(settings.findById("menu.customization.1")).thenReturn(Optional.of(row));
        service.save(item("FOOD"), null);
        verify(settings).delete(row);
    }
    @Test void legacyDrinkOptionsRemainAvailable() {
        var config = service.get(item("DRINK"));
        assertEquals(List.of("M","L"), config.sizes());
        assertFalse(config.sugarLevels().isEmpty()); assertTrue(config.legacy());
    }
    @Test void backendRejectsFoodSizeAndSugarButAcceptsPlainFood() {
        MenuItemRepository items = mock(MenuItemRepository.class);
        when(items.findById(1L)).thenReturn(Optional.of(item("FOOD")));
        OrderSupportService support = new OrderSupportService(items,null,null,null,new ObjectMapper(),null,null);
        ReflectionTestUtils.setField(support,"customizations",service);
        assertThrows(ApiException.class, () -> support.buildItem(new OrderItemRequest(1L,1,null,List.of(),null,null,null,"M")));
        assertThrows(ApiException.class, () -> support.buildItem(new OrderItemRequest(1L,1,null,List.of(),"100%",null,null,null)));
        assertThrows(ApiException.class, () -> support.buildItem(new OrderItemRequest(1L,1,null,List.of(12L),null,null,null,null)));
        var line = support.buildItem(new OrderItemRequest(1L,1,null,List.of(),null,null,null,null));
        assertNull(line.getSizeName()); assertNull(line.getSugarLevel()); assertNull(line.getIceLevel());
        assertEquals(35000L,line.getSubtotal());
    }
}
