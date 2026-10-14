package com.example.project.controller;

import com.example.project.payos.PayosException;
import com.example.project.service.QrPaymentWatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * payOS gọi vào đây khi khách chuyển khoản (không cần đăng nhập vì nằm trong /api/public/**).
 * Đăng ký URL ở my.payos.vn > Kênh thanh toán > Webhook: https://<địa chỉ công khai>/api/public/payos/webhook
 * (chạy localhost thì mở đường hầm bằng ngrok / cloudflared).
 * Dữ liệu chỉ được dùng sau khi kiểm chữ ký và hỏi lại payOS, nên luôn trả 200 để payOS không gửi lại;
 * webhook sai chữ ký chỉ bị ghi log.
 */
@RestController
@RequestMapping("/api/public/payos")
public class PayosWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PayosWebhookController.class);

    private final QrPaymentWatcher watcher;

    public PayosWebhookController(QrPaymentWatcher watcher) {
        this.watcher = watcher;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> webhook(@RequestBody(required = false) String body) {
        if (body != null && !body.isBlank()) {
            try {
                watcher.handleWebhook(body);
            } catch (PayosException e) {
                log.warn("Bỏ qua webhook payOS: {}", e.getMessage());
            }
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
}
