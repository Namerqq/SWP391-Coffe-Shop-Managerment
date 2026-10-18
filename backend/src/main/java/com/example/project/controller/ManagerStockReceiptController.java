package com.example.project.controller;

import com.example.project.dto.inventory.StockReceiptRequest;
import com.example.project.dto.inventory.StockReceiptView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.StockReceiptService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Quản lý Phiếu nhập kho & Yêu cầu bổ sung nguyên liệu (UC-IV02, UC-IV03, UC-IV04).
 * Dành riêng cho MANAGER.
 */
@RestController
@RequestMapping("/api/manager/stock-receipts")
@RequireRole("MANAGER")
public class ManagerStockReceiptController {

    private final StockReceiptService service;

    public ManagerStockReceiptController(StockReceiptService service) {
        this.service = service;
    }

    /** Danh sách phiếu nhập / yêu cầu bổ sung. */
    @GetMapping
    public List<StockReceiptView> list(@RequestParam(required = false) String status,
                                      @RequestParam(required = false) String keyword) {
        return service.list(status, keyword);
    }

    /** Chi tiết 1 phiếu nhập kho kèm danh sách nguyên liệu. */
    @GetMapping("/{id}")
    public StockReceiptView detail(@PathVariable Long id) {
        return service.getById(id);
    }

    /** Tạo phiếu nhập kho mới (trạng thái DRAFT). */
    @PostMapping
    public StockReceiptView createDraft(@Valid @RequestBody StockReceiptRequest req, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return service.createDraft(req, me);
    }

    /** Cập nhật phiếu nhập kho đang ở trạng thái DRAFT. */
    @PutMapping("/{id}")
    public StockReceiptView updateDraft(@PathVariable Long id, @Valid @RequestBody StockReceiptRequest req) {
        return service.updateDraft(id, req);
    }

    /**
     * Xác nhận nhập kho: chuyển sang RECEIVED, tăng số lượng tồn và tạo các giao dịch STOCK_IN.
     */
    @PostMapping("/{id}/confirm")
    public StockReceiptView confirm(@PathVariable Long id, HttpServletRequest http) {
        User me = (User) http.getAttribute(AuthInterceptor.CURRENT_USER);
        return service.confirmReceipt(id, me);
    }

    /**
     * Hủy phiếu nhập kho (hoặc từ chối yêu cầu bổ sung).
     */
    @PostMapping("/{id}/cancel")
    public StockReceiptView cancel(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return service.cancelReceipt(id, reason);
    }
}
