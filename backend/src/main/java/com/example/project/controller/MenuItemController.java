package com.example.project.controller;

import com.example.project.dto.AvailabilityRequest;
import com.example.project.dto.MenuItemRequest;
import com.example.project.dto.MenuItemResponse;
import com.example.project.service.MenuItemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API màn Menu management (Manager) - UC-DM01, UC-DM02. */
@RestController
@RequestMapping("/api/menu-items")
public class MenuItemController {

    private final MenuItemService service;

    public MenuItemController(MenuItemService service) {
        this.service = service;
    }

    // vd: /api/menu-items?keyword=cà phê&categoryId=1&includeInactive=true (hiện cả món đã xóa / INACTIVE)
    @GetMapping
    public List<MenuItemResponse> search(@RequestParam(required = false) String keyword,
                                         @RequestParam(required = false) Long categoryId,
                                         @RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.search(keyword, categoryId, includeInactive);
    }

    @GetMapping("/{id}")
    public MenuItemResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    public ResponseEntity<MenuItemResponse> create(@Valid @RequestBody MenuItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    public MenuItemResponse update(@PathVariable Long id, @Valid @RequestBody MenuItemRequest req) {
        return service.update(id, req);
    }

    @PatchMapping("/{id}/availability")
    public MenuItemResponse changeAvailability(@PathVariable Long id, @Valid @RequestBody AvailabilityRequest req) {
        return service.changeAvailability(id, req.availabilityStatus());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public MenuItemResponse restore(@PathVariable Long id) {
        return service.restore(id);
    }
}
