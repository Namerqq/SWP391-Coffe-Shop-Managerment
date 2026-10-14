package com.example.project.controller;

import com.example.project.dto.cashier.QrEventsView;
import com.example.project.dto.cashier.QrPaymentView;
import com.example.project.dto.cashier.QrSessionRequest;
import com.example.project.dto.cashier.QrTakeawayRequest;
import com.example.project.entity.User;
import com.example.project.security.AuthInterceptor;
import com.example.project.security.RequireRole;
import com.example.project.service.QrPaymentService;
import com.example.project.service.QrPaymentWatcher;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Thu ngân: thanh toán bằng mã QR payOS, hệ thống tự xác nhận khi tiền về (không cần bấm xác nhận).
 * Màn hình đang hiện mã QR hỏi GET /{id} mỗi 2 giây để biết khách đã trả chưa.
 */
@RestController
@RequestMapping("/api/cashier/qr-payments")
@RequireRole("CASHIER")
public class QrPaymentController {

    private final QrPaymentService service;
    private final QrPaymentWatcher watcher;

    public QrPaymentController(QrPaymentService service, QrPaymentWatcher watcher) {
        this.service = service;
        this.watcher = watcher;
    }

    /** Tạo mã cho các đơn tại bàn. Body: { "customerId": 3, "pointsToRedeem": 10, "orderIds": [12, 15], "expectedSubtotal": 85000 } */
    @PostMapping("/sessions/{sessionId}")
    public ResponseEntity<QrPaymentView> createForSession(@PathVariable Long sessionId, @Valid @RequestBody QrSessionRequest req,
                                                          @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createForSession(sessionId, req, cashier));
    }

    /** Tạo mã cho đơn mang đi (khách trả xong mới tạo đơn). Body giống /api/cashier/takeaway nhưng không có method. */
    @PostMapping("/takeaway")
    public ResponseEntity<QrPaymentView> createForTakeaway(@Valid @RequestBody QrTakeawayRequest req,
                                                           @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createForTakeaway(req, cashier));
    }

    /** Các mã đang chờ khách quét: ?sessionId=5 (của 1 bàn) hoặc ?target=TAKEAWAY / TABLE, bỏ trống = tất cả. */
    @GetMapping("/pending")
    public List<QrPaymentView> pending(@RequestParam(required = false) Long sessionId,
                                       @RequestParam(required = false) String target) {
        return service.pending(sessionId, target);
    }

    /** Mã vừa thanh toán xong để mọi màn thu ngân hiện thông báo. ?since = serverTime của lần hỏi trước. */
    @GetMapping("/events")
    public QrEventsView events(@RequestParam(required = false)
                               @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        return service.events(since);
    }

    @GetMapping("/{id}")
    public QrPaymentView get(@PathVariable Long id) {
        return service.view(id);
    }

    /** Hủy mã (muốn thu cách khác). Khách vừa trả xong đúng lúc đó thì trả về PAID. */
    @PostMapping("/{id}/cancel")
    public QrPaymentView cancel(@PathVariable Long id) {
        return watcher.cancel(id);
    }

    /** Mã đã hết hạn / đã hủy -> tạo mã mới cho đúng các đơn (hoặc giỏ hàng) đó. */
    @PostMapping("/{id}/renew")
    public ResponseEntity<QrPaymentView> renew(@PathVariable Long id,
                                               @RequestAttribute(AuthInterceptor.CURRENT_USER) User cashier) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.renew(id, cashier));
    }
}
