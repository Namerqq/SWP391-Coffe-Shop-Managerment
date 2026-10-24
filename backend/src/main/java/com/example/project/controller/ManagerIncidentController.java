package com.example.project.controller;

import com.example.project.dto.incident.IncidentReportView;
import com.example.project.dto.incident.IncidentReviewRequest;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.IncidentReportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Quản lý xem biên bản sự cố đổ / vỡ món của phục vụ và quyết định mức phạt. */
@RestController
@RequestMapping("/api/manager/incidents")
@RequireRole("MANAGER")
public class ManagerIncidentController {

    private final IncidentReportService service;

    public ManagerIncidentController(IncidentReportService service) {
        this.service = service;
    }

    /** status = PENDING (chờ xử lý) / REVIEWED (đã xử lý), để trống = tất cả. */
    @GetMapping
    public List<IncidentReportView> list(@RequestParam(required = false) String status) {
        return service.list(status);
    }

    /** Body: { "penaltyAmount": 20000, "managerNote": "Nhắc nhở lần 1" } */
    @PatchMapping("/{id}/review")
    public IncidentReportView review(@PathVariable Long id,
                                     @Valid @RequestBody IncidentReviewRequest req,
                                     @RequestAttribute(AuthInterceptor.CURRENT_USER) User manager) {
        return service.review(id, req, manager);
    }
}
