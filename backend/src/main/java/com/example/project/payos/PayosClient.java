package com.example.project.payos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gọi API payOS (https://payos.vn/docs/api): tạo / xem / hủy link thanh toán và kiểm tra webhook.
 * Client ID, API Key, Checksum Key lấy từ cấu hình payos.* (biến môi trường PAYOS_CLIENT_ID, PAYOS_API_KEY,
 * PAYOS_CHECKSUM_KEY). Thiếu 1 trong 3 thì isConfigured() = false, màn thu ngân ẩn cách trả QR.
 */
@Component
public class PayosClient {

    private static final Logger log = LoggerFactory.getLogger(PayosClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    private final String clientId;
    private final String apiKey;
    private final String checksumKey;
    private final String baseUrl;
    private final String returnUrl;
    private final String cancelUrl;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public PayosClient(@Value("${payos.client-id:}") String clientId,
                       @Value("${payos.api-key:}") String apiKey,
                       @Value("${payos.checksum-key:}") String checksumKey,
                       @Value("${payos.base-url:https://api-merchant.payos.vn}") String baseUrl,
                       @Value("${app.payos.return-url:http://localhost:5173/cashier}") String returnUrl,
                       @Value("${app.payos.cancel-url:http://localhost:5173/cashier}") String cancelUrl,
                       ObjectMapper mapper) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.checksumKey = checksumKey == null ? "" : checksumKey.trim();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.returnUrl = returnUrl;
        this.cancelUrl = cancelUrl;
        this.mapper = mapper;
        if (!isConfigured()) {
            log.info("Chưa cấu hình payOS (PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY): tắt thanh toán QR tự xác nhận.");
        }
    }

    /** Link vừa tạo: qrCode là chuỗi VietQR để vẽ mã QR, checkoutUrl là trang thanh toán của payOS. */
    public record CreatedLink(String paymentLinkId, String qrCode, String checkoutUrl, String status) {}

    /** Trạng thái link trên payOS: PENDING, PROCESSING, UNDERPAID, PAID, CANCELLED, EXPIRED, FAILED. */
    public record LinkInfo(String id, long orderCode, long amount, long amountPaid, long amountRemaining,
                           String status, String reference) {
        public boolean isPaid() { return "PAID".equals(status) || (amount > 0 && amountPaid >= amount); }
        public boolean isClosed() { return "CANCELLED".equals(status) || "EXPIRED".equals(status) || "FAILED".equals(status); }
    }

    /** Dữ liệu webhook đã kiểm chữ ký. success = payOS báo giao dịch thành công (code "00"). */
    public record WebhookPayload(long orderCode, long amount, String description, String reference,
                                 String transactionDateTime, String paymentLinkId, boolean success) {}

    private record Envelope(Map<String, Object> data, String signature) {}

    public boolean isConfigured() {
        return !clientId.isEmpty() && !apiKey.isEmpty() && !checksumKey.isEmpty();
    }

    /** Tạo link thanh toán. expiredAtEpochSecond = lúc mã QR hết hạn (Unix timestamp, giây). */
    public CreatedLink createLink(long orderCode, long amount, String description, long expiredAtEpochSecond) {
        requireConfigured();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderCode", orderCode);
        body.put("amount", amount);
        body.put("description", description);
        body.put("returnUrl", returnUrl);
        body.put("cancelUrl", cancelUrl);
        body.put("expiredAt", expiredAtEpochSecond);
        body.put("signature", PayosSignature.forCreateLink(amount, cancelUrl, description, orderCode, returnUrl, checksumKey));
        Envelope res = send("POST", "/v2/payment-requests", body);
        if (res.signature() != null && !PayosSignature.matches(res.data(), res.signature(), checksumKey)) {
            log.warn("Chữ ký phản hồi tạo link payOS không khớp (orderCode {}). Kiểm tra lại PAYOS_CHECKSUM_KEY.", orderCode);
        }
        Map<String, Object> d = res.data();
        String qrCode = str(d, "qrCode");
        if (qrCode == null || qrCode.isBlank()) throw new PayosException("NO_QR", "payOS không trả về mã QR.");
        return new CreatedLink(str(d, "paymentLinkId"), qrCode, str(d, "checkoutUrl"), str(d, "status"));
    }

    public LinkInfo getLink(long orderCode) {
        requireConfigured();
        return toLinkInfo(send("GET", "/v2/payment-requests/" + orderCode, null).data());
    }

    public LinkInfo cancelLink(long orderCode, String reason) {
        requireConfigured();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("cancellationReason", reason);
        return toLinkInfo(send("POST", "/v2/payment-requests/" + orderCode + "/cancel", body).data());
    }

    /** Đọc body webhook, kiểm chữ ký bằng Checksum Key. Sai chữ ký -> PayosException. */
    public WebhookPayload verifyWebhook(String rawBody) {
        requireConfigured();
        Map<String, Object> root = parse(rawBody);
        if (!(root.get("data") instanceof Map<?, ?> rawData)) throw new PayosException("INVALID", "Webhook không có data.");
        Map<String, Object> data = new LinkedHashMap<>();
        rawData.forEach((k, v) -> data.put(String.valueOf(k), v));
        if (!PayosSignature.matches(data, str(root, "signature"), checksumKey)) {
            throw new PayosException("INVALID_SIGNATURE", "Chữ ký webhook không hợp lệ (sai Checksum Key hoặc dữ liệu bị sửa).");
        }
        boolean success = "00".equals(str(root, "code")) && "00".equals(str(data, "code"));
        return new WebhookPayload(num(data, "orderCode"), num(data, "amount"), str(data, "description"),
                str(data, "reference"), str(data, "transactionDateTime"), str(data, "paymentLinkId"), success);
    }

    // ===== HTTP =====

    private Envelope send(String method, String path, Object body) {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(TIMEOUT)
                .header("x-client-id", clientId)
                .header("x-api-key", apiKey)
                .header("Content-Type", "application/json");
        if ("POST".equals(method)) {
            String json;
            try {
                json = mapper.writeValueAsString(body);
            } catch (IOException e) {
                throw new PayosException("Không tạo được dữ liệu gửi payOS.", e);
            }
            b.POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
        } else {
            b.GET();
        }

        HttpResponse<String> res;
        try {
            res = http.send(b.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new PayosException("Không kết nối được payOS (" + e.getClass().getSimpleName() + ").", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PayosException("Bị ngắt khi đang gọi payOS.", e);
        }

        Map<String, Object> root;
        try {
            root = parse(res.body());
        } catch (PayosException e) {
            throw new PayosException("HTTP_" + res.statusCode(), "payOS trả về dữ liệu không đọc được (HTTP " + res.statusCode() + ").");
        }
        String code = str(root, "code");
        if (res.statusCode() >= 400 || !"00".equals(code)) {
            String desc = str(root, "desc");
            throw new PayosException(code != null ? code : "HTTP_" + res.statusCode(),
                    desc != null ? desc : "payOS báo lỗi (HTTP " + res.statusCode() + ").");
        }
        if (!(root.get("data") instanceof Map<?, ?> rawData)) throw new PayosException(code, "payOS không trả về dữ liệu.");
        Map<String, Object> data = new LinkedHashMap<>();
        rawData.forEach((k, v) -> data.put(String.valueOf(k), v));
        return new Envelope(data, str(root, "signature"));
    }

    private LinkInfo toLinkInfo(Map<String, Object> d) {
        String reference = null;
        if (d.get("transactions") instanceof List<?> list) {
            for (Object t : list) {
                if (t instanceof Map<?, ?> m && m.get("reference") != null) {
                    reference = String.valueOf(m.get("reference"));
                    break;
                }
            }
        }
        return new LinkInfo(str(d, "id"), num(d, "orderCode"), num(d, "amount"), num(d, "amountPaid"),
                num(d, "amountRemaining"), str(d, "status"), reference);
    }

    private Map<String, Object> parse(String body) {
        if (body == null || body.isBlank()) throw new PayosException("EMPTY", "Dữ liệu rỗng.");
        try {
            return mapper.readValue(body, new TypeReference<Map<String, Object>>() {});
        } catch (IOException e) {
            throw new PayosException("INVALID_JSON", "Dữ liệu không phải JSON hợp lệ.");
        }
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new PayosException("NOT_CONFIGURED",
                    "Chưa cấu hình payOS. Đặt PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY rồi khởi động lại backend.");
        }
    }

    private static String str(Map<String, ?> m, String key) {
        Object v = m.get(key);
        return v == null ? null : String.valueOf(v);
    }

    private static long num(Map<String, ?> m, String key) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.longValue();
        if (v instanceof String s && !s.isBlank()) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }
}
