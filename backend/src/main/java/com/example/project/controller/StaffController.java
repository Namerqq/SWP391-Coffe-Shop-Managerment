package com.example.project.controller;

import com.example.project.dto.order.SessionView;
import com.example.project.dto.order.StaffMenuResponse;
import com.example.project.dto.order.TableBoardItem;
import com.example.project.security.RequireRole;
import com.example.project.service.MenuCatalogService;
import com.example.project.service.TableBoardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** API dùng chung cho Thu ngân và Phục vụ: menu gọi món, sơ đồ bàn, lượt khách của 1 bàn. */
@RestController
@RequestMapping("/api/staff")
@RequireRole({"CASHIER", "WAITER"})
public class StaffController {

    private final MenuCatalogService menuCatalogService;
    private final TableBoardService tableBoardService;

    public StaffController(MenuCatalogService menuCatalogService, TableBoardService tableBoardService) {
        this.menuCatalogService = menuCatalogService;
        this.tableBoardService = tableBoardService;
    }

    @GetMapping("/menu")
    public StaffMenuResponse menu() {
        return menuCatalogService.staffMenu();
    }

    @GetMapping("/tables")
    public List<TableBoardItem> tables() {
        return tableBoardService.board();
    }

    @GetMapping("/tables/{tableId}/session")
    public SessionView session(@PathVariable Long tableId) {
        return tableBoardService.currentSession(tableId);
    }
}
