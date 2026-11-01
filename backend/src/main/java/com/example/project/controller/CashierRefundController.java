package com.example.project.controller;

import com.example.project.dto.refund.OrderToRefundView;
import com.example.project.dto.refund.RefundCompleteRequest;
import com.example.project.dto.refund.RefundItemsRequest;
import com.example.project.dto.refund.RefundPreview;
import com.example.project.dto.refund.RefundPreviewRequest;
import com.example.project.dto.refund.RefundReasonRequest;
import com.example.project.dto.refund.RefundView;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.RefundService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Hoàn tiền của Thu ngân (ThangNN Iter3, Template 6 "Refund and Loyalty Reversal").
 * Đơn tại quầy: hoàn món chưa mang ra (mở từ Lịch sử đơn). Đơn online trả QR: hủy và hoàn (mở từ Đơn giao hàng),
 * hoặc tạo phiếu hoàn cho đơn đã bị hủy. Phiếu chuyển khoản chờ thu ngân nhập mã giao dịch
 * (popup Hoàn tiền mở từ Lịch sử đơn, không có màn riêng).
 */
@RestController
@RequestMapping("/api/cashier/refunds")
@RequireRole("CASHIER")
public class CashierRefundController {

    private final RefundService service;

    public CashierRefundController(RefundService service) {
        this.service = service;
    }

    /** Phiếu hoàn tạo trong 1 ngày. GET /api/cashier/refunds?date=2026-10-31 (bỏ trống = hôm nay). */
    @GetMapping
    public List<RefundView> list(@RequestParam(required = false)
                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.listByDay(date);
    }

    /** Phiếu chờ chuyển khoản trả khách. */
    @GetMapping("/pending")
    public List<RefundView> pending() {
        return service.pending();
    }

    /** Đơn online đã trả QR, đã bị hủy (giao không thành công...) và chưa có phiếu hoàn. */
    @GetMapping("/to-refund")
    public List<OrderToRefundView> ordersToRefund() {
        return service.ordersToRefund();
    }

    /** Xem trước số tiền / điểm. Body: { "orderId": 12, "itemIds": [31, 32] } */
    @PostMapping("/preview")
    public RefundPreview preview(@RequestBody RefundPreviewRequest req) {
        return service.preview(req);
    }

    /**
     * Hoàn tiền món chưa mang ra của đơn tại bàn / mang đi đã thanh toán.
     * Body: { "itemIds": [31], "reason": "Hết nguyên liệu", "method": "CASH", "expectedAmount": 27000 }
     */
    @PostMapping("/orders/{orderId}/items")
    public RefundView refundItems(@PathVariable Long orderId, @Valid @RequestBody RefundItemsRequest req,
                                  @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.refundItems(orderId, req, cashier);
    }

    /** Hủy đơn online đã trả QR (phục vụ chưa lấy hàng) + tạo phiếu hoàn chuyển khoản. Body: { "reason": "..." } */
    @PostMapping("/delivery-orders/{orderId}/cancel")
    public RefundView cancelDeliveryAndRefund(@PathVariable Long orderId, @Valid @RequestBody RefundReasonRequest req,
                                              @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.cancelDeliveryAndRefund(orderId, req.reason(), cashier);
    }

    /** Tạo phiếu hoàn chuyển khoản cho đơn online đã trả QR nhưng đã bị hủy. Body: { "reason": "..." } (không bắt buộc) */
    @PostMapping("/delivery-orders/{orderId}")
    public RefundView refundCancelledDelivery(@PathVariable Long orderId,
                                              @Valid @RequestBody(required = false) RefundReasonRequest req,
                                              @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.refundCancelledDelivery(orderId, req == null ? null : req.reason(), cashier);
    }

    /** Đã chuyển khoản trả khách. Body: { "bankReference": "FT26304123456" } */
    @PostMapping("/{id}/complete")
    public RefundView complete(@PathVariable Long id, @Valid @RequestBody RefundCompleteRequest req,
                               @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return service.complete(id, req, cashier);
    }
}
