package com.example.project.controller;

import com.example.project.dto.cashier.CustomerCreateRequest;
import com.example.project.dto.cashier.OrderHistoryView;
import com.example.project.dto.cashier.PayRequest;
import com.example.project.dto.cashier.PaymentResult;
import com.example.project.dto.cashier.PaymentSettingsView;
import com.example.project.dto.cashier.ReceiptView;
import com.example.project.dto.cashier.TakeawayRequest;
import com.example.project.dto.online.OnlineOrderView;
import com.example.project.dto.order.CustomerView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.CashierHistoryService;
import com.example.project.service.CashierService;
import com.example.project.service.OnlineOrderService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.time.LocalDateTime;

import java.time.LocalDate;

import java.util.List;
import java.util.Map;

/**
 * Màn hình Thu ngân. Sơ đồ bàn / chi tiết bàn dùng API chung /api/staff/tables (StaffController),
 * menu gọi món dùng /api/staff/menu.
 */
@RestController
@RequestMapping("/api/cashier")
@RequireRole("CASHIER")
public class CashierController {

    private final CashierService service;
    private final OnlineOrderService onlineOrderService;
    private final CashierHistoryService historyService;

    public CashierController(CashierService service, OnlineOrderService onlineOrderService,
                             CashierHistoryService historyService) {
        this.service = service;
        this.onlineOrderService = onlineOrderService;
        this.historyService = historyService;
    }

    /** UC-C10: tìm khách theo số điện thoại. Không có -> 404. */
    @GetMapping("/customers")
    public CustomerView findCustomer(@RequestParam String phone) {
        return service.findCustomer(phone);
    }

    /** UC-C13: đăng ký khách thân thiết. Body: { "phoneNumber": "0901234567", "fullName": "An" } */
    @PostMapping("/customers")
    public ResponseEntity<CustomerView> createCustomer(@Valid @RequestBody CustomerCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCustomer(req));
    }

    @GetMapping("/payment-settings")
    public PaymentSettingsView paymentSettings() {
        return service.paymentSettings();
    }

    /**
     * Thu tiền đơn tại bàn, đơn ở trạng thái phục vụ nào cũng được (chờ pha / đang pha / đã phục vụ).
     * Body: { "method": "CASH", "customerId": 3, "pointsToRedeem": 10, "orderIds": [12, 15], "expectedSubtotal": 85000 }
     * orderIds bỏ trống = thu mọi đơn chưa thanh toán. Bàn tự trả về trống khi mọi đơn đã phục vụ và đã thanh toán.
     */
    @PostMapping("/sessions/{sessionId}/pay")
    public PaymentResult paySession(@PathVariable Long sessionId, @Valid @RequestBody PayRequest req,
                                    @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.paySession(sessionId, req, cashier);
    }

    /** Bán mang đi: tạo đơn + thu tiền cùng lúc. */
    @PostMapping("/takeaway")
    public PaymentResult takeaway(@Valid @RequestBody TakeawayRequest req,
                                  @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.takeaway(req, cashier);
    }

    @GetMapping("/payments/{paymentId}/receipt")
    public ReceiptView receipt(@PathVariable Long paymentId) {
        return service.receipt(paymentId);
    }

    /**
     * UC-C15 View Bills History: mọi đơn trong 1 ngày kèm hóa đơn của đơn đã thanh toán, và tiền đã thu trong ngày.
     * GET /api/cashier/history?date=2026-10-24   (bỏ trống date = hôm nay; ngày tương lai -> 400)
     */
    @GetMapping("/history")
    public OrderHistoryView history(@RequestParam(required = false)
                                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return historyService.history(date);
    }

    /**
     * Danh sách đơn giao hàng online cho thu ngân (Ship Order List).
     * GET /api/cashier/delivery-orders
     * Lọc (không bắt buộc): ?from=2026-10-20T08:00&to=2026-10-25T23:59&code=0012
     * from / to = thời gian đặt đơn, code = mã đơn (nhập 1 phần cũng được). Bỏ trống = mọi đơn.
     */
    @GetMapping("/delivery-orders")
    public List<OnlineOrderView> deliveryOrders(@RequestParam(required = false)
                                                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
                                                @RequestParam(required = false)
                                                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
                                                @RequestParam(required = false) String code) {
        return onlineOrderService.listDeliveryOrders(from, to, code);
    }

    /**
     * Thu ngân xác nhận đơn giao hàng.
     * POST /api/cashier/delivery-orders/{id}/confirm
     */
    @PostMapping("/delivery-orders/{id}/confirm")
    public OnlineOrderView confirmDeliveryOrder(@PathVariable Long id) {
        return onlineOrderService.confirmDeliveryOrder(id);
    }

    /**
     * Thu ngân hủy đơn giao hàng trước khi giao (ví dụ: hết nguyên liệu).
     * POST /api/cashier/delivery-orders/{id}/cancel
     */
    @PostMapping("/delivery-orders/{id}/cancel")
    public OnlineOrderView cancelDeliveryOrder(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "Hết nguyên liệu";
        return onlineOrderService.cashierCancelDeliveryOrder(id, reason);
    }
}
