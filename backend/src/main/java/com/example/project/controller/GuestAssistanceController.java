package com.example.project.controller;

import com.example.project.dto.assistance.AssistanceView;
import com.example.project.service.GuestAssistanceService;
import com.example.project.service.GuestSessionStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/order/assistance")
public class GuestAssistanceController {
    private final GuestAssistanceService service;
    public GuestAssistanceController(GuestAssistanceService service) { this.service = service; }
    public record Request(@Size(max = 300, message = "Ghi chú tối đa 300 ký tự") String note) {}
    @GetMapping
    public ResponseEntity<AssistanceView> current(
            @RequestHeader(value = GuestSessionStore.HEADER, required = false) String token) {
        AssistanceView call = service.current(token);
        return call == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(call);
    }
    @PostMapping
    public AssistanceView create(@Valid @RequestBody Request request,
            @RequestHeader(value = GuestSessionStore.HEADER, required = false) String token) {
        return service.create(token, request.note());
    }
}
