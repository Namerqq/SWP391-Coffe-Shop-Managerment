package com.example.project.controller;

import com.example.project.dto.onlinepay.OnlineQrRequest;
import com.example.project.dto.onlinepay.OnlineQrView;
import com.example.project.dto.onlinepay.OnlineReceiptView;
import com.example.project.service.OnlineReceiptService;
import com.example.project.service.QrPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Khách đặt online thanh toán QR và xem hóa đơn (ThangNN Iter2: Online Payment Method, Online QR Payment).
 * Nằm trong /api/public/** nên không cần đăng nhập. Đơn trả QR CHƯA được tạo lúc tạo mã: khách trả xong
 * hệ thống mới tạo đơn ONLINE (QrPaymentService.settleOnline). Đơn COD vẫn đi qua /api/public/online/orders.
 * Khách online không tích điểm và không dùng điểm.
 */
@RestController
@RequestMapping("/api/public/online")
public class OnlinePaymentController {

    private final QrPaymentService qrPaymentService;
    private final OnlineReceiptService receiptService;

    public OnlinePaymentController(QrPaymentService qrPaymentService, OnlineReceiptService receiptService) {
        this.qrPaymentService = qrPaymentService;
        this.receiptService = receiptService;
    }

    /**
     * Tạo mã QR cho giỏ hàng online. Body: { "customerName": "An", "customerPhone": "0901234567",
     * "deliveryAddress": "...", "note": "...", "items": [ ...giống OrderItemRequest... ] }
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

    /** Hóa đơn điện tử của 1 đơn online đã thanh toán, tra bằng mã đơn. GET /api/public/online/receipts/261023-0008 */
    @GetMapping("/receipts/{code}")
    public OnlineReceiptView receipt(@PathVariable String code) {
        return receiptService.byCode(code);
    }
}
