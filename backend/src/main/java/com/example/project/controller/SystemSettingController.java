package com.example.project.controller;

import com.example.project.dto.SettingResponse;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.service.SystemSettingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** UC-AD06 Configure System Settings. Body của PUT: { "shop.name": "Cafe Shop", "sales.vat_percent": "8", ... } */
@RestController
@RequestMapping("/api/admin/settings")
public class SystemSettingController {

    private final SystemSettingService service;

    public SystemSettingController(SystemSettingService service) {
        this.service = service;
    }

    @GetMapping
    public List<SettingResponse> getAll() {
        return service.getAll();
    }

    @PutMapping
    public List<SettingResponse> update(@RequestBody Map<String, String> values,
                                        @RequestAttribute(AuthInterceptor.CURRENT_USER) User currentUser) {
        return service.update(values, currentUser.getUsername());
    }
}
