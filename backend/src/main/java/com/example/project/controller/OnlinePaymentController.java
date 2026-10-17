package com.example.project.controller;

import com.example.project.dto.onlinepay.OnlineLoyaltyView;
import com.example.project.dto.onlinepay.OnlineQrRequest;
import com.example.project.dto.onlinepay.OnlineQrView;
import com.example.project.service.OnlineLoyaltyService;
import com.example.project.service.QrPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Khách đặt online thanh toán QR và tích điểm (ThangNN Iter2: Online Payment Method & Loyalty, Online QR Payment).
 * Nằm trong /api/public/** nên không cần đăng nhập. Đơn trả QR CHƯA được tạo lúc tạo mã: khách trả xong
 * hệ thống mới tạo đơn ONLINE (QrPaymentService.settleOnline). Đơn COD vẫn đi qua /api/public/online/orders.
 */
@RestController
@RequestMapping("/api/public/online")
public class OnlinePaymentController {

    private final QrPaymentService qrPaymentService;
    private final OnlineLoyaltyService loyaltyService;

    public OnlinePaymentController(QrPaymentService qrPaymentService, OnlineLoyaltyService loyaltyService) {
        this.qrPaymentService = qrPaymentService;
        this.loyaltyService = loyaltyService;
    }

    /** Tra điểm theo SĐT nhận hàng. Chưa là thành viên -> member = false. GET /api/public/online/loyalty?phone=0901234567 */
    @GetMapping("/loyalty")
    public OnlineLoyaltyView loyalty(@RequestParam String phone) {
        return loyaltyService.lookup(phone);
    }

    /**
     * Tạo mã QR cho giỏ hàng online. Body: { "customerName": "An", "customerPhone": "0901234567",
     * "deliveryAddress": "...", "note": "...", "items": [ ...giống OrderItemRequest... ],
     * "joinLoyalty": true, "pointsToRedeem": 10 }
     */
    @PostMapping("/qr-payments")
    public ResponseEntity<OnlineQrView> createQr(@Valid @RequestBody OnlineQrRequest req) {
        String paymentLinkId = qrPaymentService.createForOnline(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(qrPaymentService.viewOnline(paymentLinkId));
    }

    /** Trang của khách hỏi trạng thái mã mỗi 3 giây. paymentLinkId do payOS cấp (cũng là tham số id payOS gắn vào link quay về). */
    @GetMapping("/qr-payments/{paymentLinkId}")
    public OnlineQrView getQr(@PathVariable String paymentLinkId) {
        return qrPaymentService.viewOnline(paymentLinkId);
    }
}
