package com.example.project.controller;
import com.example.project.dto.menu.*;
import com.example.project.security.RequireRole;
import com.example.project.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/manager/menu")
@RequireRole("MANAGER")
public class ManagerMenuController {
    private final MenuManagementService service;
    private final FileStorageService storage;
    public ManagerMenuController(MenuManagementService service, FileStorageService storage) { this.service=service;this.storage=storage; }
    @GetMapping public Map<String,Object> catalog() { return service.catalog(); }
    @PostMapping("/categories") public CategoryView createCategory(@Valid @RequestBody CategoryRequest req) { return service.saveCategory(null,req); }
    @PutMapping("/categories/{id}") public CategoryView updateCategory(@PathVariable Long id,@Valid @RequestBody CategoryRequest req) { return service.saveCategory(id,req); }
    @DeleteMapping("/categories/{id}") public void deleteCategory(@PathVariable Long id) { service.deleteCategory(id); }
    @PostMapping("/items") public ManagedItemView create(@Valid @RequestBody MenuRequest req) { return service.saveItem(null,req); }
    @PutMapping("/items/{id}") public ManagedItemView update(@PathVariable Long id,@Valid @RequestBody MenuRequest req) { return service.saveItem(id,req); }
    @DeleteMapping("/items/{id}") public void delete(@PathVariable Long id) { service.deleteItem(id); }
    public record Availability(@NotNull Boolean available) {}
    @PatchMapping("/items/{id}/availability") public ManagedItemView availability(@PathVariable Long id,@Valid @RequestBody Availability req) { return service.availability(id,req.available()); }
    @PostMapping("/images") public Map<String,String> image(@RequestParam("file") MultipartFile file) {
        storage.validateMenuImage(file);
        return Map.of("url",storage.saveImage(file,"menu"));
    }
}
