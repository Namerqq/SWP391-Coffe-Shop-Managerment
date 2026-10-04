package com.example.project.controller;

import com.example.project.dto.guest.GuestTableRequest;
import com.example.project.dto.guest.GuestTableView;
import com.example.project.dto.order.StaffMenuResponse;
import com.example.project.service.GuestTableService;
import com.example.project.service.GuestSessionStore;
import com.example.project.service.MenuCatalogService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Khách tại bàn: quét QR, xem menu (không cần đăng nhập, nằm dưới /api/public). */
@RestController
@RequestMapping("/api/public/order")
public class GuestTableController {

    private final GuestTableService service;
    private final MenuCatalogService menuCatalogService;

    public GuestTableController(GuestTableService service, MenuCatalogService menuCatalogService) {
        this.service = service;
        this.menuCatalogService = menuCatalogService;
    }

    /** Body: { "qrCode": "TABLE-01" }. Trả token để gửi lại ở header X-Guest-Token. */
    @PostMapping("/table")
    public GuestTableView openTable(@Valid @RequestBody GuestTableRequest req,
                                    @RequestHeader(value = GuestSessionStore.HEADER, required = false) String token) {
        return service.openTable(req.qrCode(), token);
    }

    /** Phiên hiện tại. Chưa quét QR / hết hạn -> 204 (không có nội dung). */
    @GetMapping("/context")
    public ResponseEntity<GuestTableView> context(@RequestHeader(value = GuestSessionStore.HEADER, required = false) String token) {
        GuestTableView v = service.context(token);
        return v == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(v);
    }

    /** Món đang bán + lựa chọn Size / Topping. */
    @GetMapping("/menu")
    public StaffMenuResponse menu() {
        return menuCatalogService.staffMenu();
    }
}
