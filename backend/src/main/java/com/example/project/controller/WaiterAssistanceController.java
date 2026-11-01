package com.example.project.controller;

import com.example.project.dto.assistance.AssistanceView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.GuestAssistanceService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/waiter/assistance-requests")
@RequireRole("WAITER")
public class WaiterAssistanceController {
    private final GuestAssistanceService service;
    public WaiterAssistanceController(GuestAssistanceService service) { this.service = service; }
    @GetMapping public List<AssistanceView> list() { return service.pending(); }
    @PatchMapping("/{id}/accept") public AssistanceView accept(@PathVariable String id,
            @RequestAttribute(AuthInterceptor.CURRENT_USER) User waiter) { return service.accept(id, waiter); }
    @PatchMapping("/{id}/complete") public AssistanceView complete(@PathVariable String id,
            @RequestAttribute(AuthInterceptor.CURRENT_USER) User waiter) { return service.complete(id, waiter); }
}
