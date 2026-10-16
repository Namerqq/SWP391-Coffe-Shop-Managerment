package com.example.project.service;
import com.example.project.dto.menu.*;
import com.example.project.dto.order.OrderItemRequest;
import com.example.project.entity.*;
import com.example.project.exception.ApiException;
import com.example.project.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MenuManagementServiceTest {
    CategoryRepository categories; MenuItemRepository items; MenuManagementService service;
    Category drink, food, topping, size;
    @BeforeEach void setup() {
        categories=mock(CategoryRepository.class);items=mock(MenuItemRepository.class);
        service=new MenuManagementService(categories,items);
        drink=category(1L,"Cà phê","DRINK");food=category(2L,"Bánh","FOOD");
        topping=category(3L,"Kem sữa","TOPPING");size=category(4L,"Cỡ ly","SIZE");
        when(categories.findAllByOrderByIdAsc()).thenReturn(List.of(drink,food,topping,size));
        when(categories.findAll()).thenReturn(List.of(drink,food,topping,size));
        for (var c:List.of(drink,food,topping,size)) when(categories.findById(c.getId())).thenReturn(Optional.of(c));
        when(items.save(any())).thenAnswer(x->x.getArgument(0));
    }
    Category category(Long id,String name,String type) {
        var c=new Category();ReflectionTestUtils.setField(c,"id",id);c.setName(name);c.setCategoryType(type);return c;
    }
    MenuItem item(Long id, Category c,long price,boolean standalone,String status) {
        var m=new MenuItem();ReflectionTestUtils.setField(m,"id",id);m.setName("Món "+id);m.setCategory(c);m.setBasePrice(price);m.setSellStandalone(standalone);m.setAvailabilityStatus(status);return m;
    }
    @Test void averageIncludesSoldOutFoodButExcludesEveryToppingAndDeletedItem() {
        var all=List.of(item(1L,drink,30000,true,MenuItem.AVAILABLE),item(2L,food,50000,true,MenuItem.UNAVAILABLE),
            item(3L,topping,10000,true,MenuItem.AVAILABLE),item(4L,topping,5000,false,MenuItem.AVAILABLE),
            item(5L,size,5000,false,MenuItem.AVAILABLE),item(6L,drink,999999,true,MenuItem.INACTIVE));
        when(items.findAllByOrderByNameAsc()).thenReturn(all);
        Map<?,?> stats=(Map<?,?>)service.catalog().get("stats");
        assertEquals(40000L,stats.get("averagePrice"));assertEquals(4,stats.get("total"));
        assertEquals(3L,stats.get("selling"));assertEquals(1L,stats.get("unavailable"));
    }
    @Test void emptyAverageIsZero() {
        when(items.findAllByOrderByNameAsc()).thenReturn(List.of());
        assertEquals(0L,((Map<?,?>)service.catalog().get("stats")).get("averagePrice"));
    }
    @Test void nonEmptyCategoryCannotBeDeleted() {
        when(items.findAll()).thenReturn(List.of(item(1L,drink,30000,true,MenuItem.UNAVAILABLE)));
        assertThrows(ApiException.class,()->service.deleteCategory(1L));assertEquals(Category.ACTIVE,drink.getStatus());
    }
    @Test void categoryWithOnlyDeletedItemsCanBeSoftDeleted() {
        when(items.findAll()).thenReturn(List.of(item(1L,drink,30000,true,MenuItem.INACTIVE)));
        service.deleteCategory(1L);assertEquals(Category.INACTIVE,drink.getStatus());verify(categories,never()).delete(any());
    }
    @Test void softDeleteKeepsEntityForOrderHistory() {
        var m=item(1L,drink,30000,true,MenuItem.AVAILABLE);when(items.findById(1L)).thenReturn(Optional.of(m));
        service.deleteItem(1L);assertEquals(MenuItem.INACTIVE,m.getAvailabilityStatus());verify(items,never()).delete(any());
        assertThrows(ApiException.class,()->service.availability(1L,true));
    }
    @Test void priceEditDoesNotChangeExistingOrderSnapshot() {
        var m=item(1L,drink,30000,true,MenuItem.AVAILABLE);when(items.findById(1L)).thenReturn(Optional.of(m));
        var support=new OrderSupportService(items,mock(OrderRepository.class),mock(PaymentRepository.class),mock(TableSessionRepository.class),new ObjectMapper());
        var line=support.buildItem(new OrderItemRequest(1L,2,null,List.of(),null,null,null));
        service.saveItem(1L,new MenuRequest("Cà phê",1L,45000L,null,null));
        assertEquals(30000L,line.getUnitPrice());assertEquals(45000L,m.getBasePrice());
    }
    @Test void renamedToppingStillWorksAsOptionAndStandalone() {
        var m=item(3L,topping,10000,true,MenuItem.AVAILABLE);when(items.findById(3L)).thenReturn(Optional.of(m));
        service.saveCategory(3L,new CategoryRequest("Kem espresso","TOPPING"));
        assertTrue(topping.isOptionGroup());assertTrue(m.isSellStandalone());
        var support=new OrderSupportService(items,mock(OrderRepository.class),mock(PaymentRepository.class),mock(TableSessionRepository.class),new ObjectMapper());
        assertEquals(10000L,support.buildItem(new OrderItemRequest(3L,1,null,List.of(),null,null,null)).getUnitPrice());
    }
    @Test void existingToppingCanBeOrderedAsThreeSeparateBoxes() {
        var m=item(3L,topping,10000,false,MenuItem.AVAILABLE);when(items.findById(3L)).thenReturn(Optional.of(m));
        var support=new OrderSupportService(items,mock(OrderRepository.class),mock(PaymentRepository.class),mock(TableSessionRepository.class),new ObjectMapper());
        var line=support.buildItem(new OrderItemRequest(3L,3,null,List.of(),null,null,"Phục vụ riêng"));
        assertEquals(3,line.getQuantity());assertEquals(30000L,line.getSubtotal());assertEquals(0L,line.getToppingPrice());
    }
    @Test void sameToppingCanBeAddedToDrinkWithoutBecomingSeparateBoxes() {
        var d=item(1L,drink,30000,true,MenuItem.AVAILABLE);
        var t=item(3L,topping,10000,false,MenuItem.AVAILABLE);
        when(items.findById(1L)).thenReturn(Optional.of(d));when(items.findById(3L)).thenReturn(Optional.of(t));
        var support=new OrderSupportService(items,mock(OrderRepository.class),mock(PaymentRepository.class),mock(TableSessionRepository.class),new ObjectMapper());
        var line=support.buildItem(new OrderItemRequest(1L,1,null,List.of(3L),"100%","100%",null));
        assertEquals(40000L,line.getSubtotal());assertEquals(10000L,line.getToppingPrice());
    }
    @Test void standaloneToppingCannotHaveDrinkCustomizations() {
        var t=item(3L,topping,10000,false,MenuItem.AVAILABLE);when(items.findById(3L)).thenReturn(Optional.of(t));
        var support=new OrderSupportService(items,mock(OrderRepository.class),mock(PaymentRepository.class),mock(TableSessionRepository.class),new ObjectMapper());
        assertThrows(ApiException.class,()->support.buildItem(new OrderItemRequest(3L,3,4L,List.of(),null,null,null)));
    }
    @Test void categoryTypeCanBeChangedOnRename() {
        service.saveCategory(3L,new CategoryRequest("Kem","FOOD"));
        assertEquals("FOOD",topping.getCategoryType());assertFalse(topping.isOptionGroup());
    }
    @Test void sizeIsHiddenFromManagementAndCannotBeEditedAsItem() {
        var t=item(5L,size,5000,false,MenuItem.AVAILABLE);
        when(items.findAllByOrderByNameAsc()).thenReturn(List.of(t));when(items.findById(5L)).thenReturn(Optional.of(t));
        var catalog=service.catalog();
        assertTrue(((List<?>)catalog.get("items")).isEmpty());
        assertFalse(((List<CategoryView>)catalog.get("categories")).stream().anyMatch(c->c.categoryType().equals("SIZE")));
        assertThrows(ApiException.class,()->service.saveCategory(4L,new CategoryRequest("Cỡ ly","DRINK")));
        assertThrows(ApiException.class,()->service.deleteItem(5L));
    }
}
