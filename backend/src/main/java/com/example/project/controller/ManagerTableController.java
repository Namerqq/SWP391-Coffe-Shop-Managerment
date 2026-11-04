package com.example.project.controller;

import com.example.project.security.RequireRole;
import com.example.project.service.ManagerTableService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/manager/tables")
@RequireRole("MANAGER")
public class ManagerTableController {
    private final ManagerTableService service;
    public ManagerTableController(ManagerTableService service) { this.service = service; }
    public record Request(@NotBlank @Size(max=30) String tableNumber, @NotNull Boolean active) {}
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { service.delete(id); }
    @GetMapping public List<ManagerTableService.View> list() { return service.list(); }
    @PostMapping public ManagerTableService.View create(@Valid @RequestBody Request r) { return service.save(null, r.tableNumber(), r.active()); }
    @PutMapping("/{id}") public ManagerTableService.View update(@PathVariable Long id, @Valid @RequestBody Request r) { return service.save(id, r.tableNumber(), r.active()); }
}
