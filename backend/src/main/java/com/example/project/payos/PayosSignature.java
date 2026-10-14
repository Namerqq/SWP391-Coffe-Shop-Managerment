package com.example.project.payos;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Collection;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * Chữ ký HMAC-SHA256 của payOS cho link thanh toán và webhook, làm đúng theo tài liệu
 * https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature :
 * sắp xếp key theo alphabet, nối "key=value" bằng "&amp;" (null -> chuỗi rỗng), rồi HMAC_SHA256 với Checksum Key.
 * Chỉ dùng thư viện có sẵn của Java để kiểm thử được độc lập (xem PayosSignatureTest).
 */
public final class PayosSignature {

    private PayosSignature() {}

    /** Chữ ký gửi kèm khi tạo link thanh toán: đúng 5 trường amount, cancelUrl, description, orderCode, returnUrl. */
    public static String forCreateLink(long amount, String cancelUrl, String description, long orderCode,
                                       String returnUrl, String checksumKey) {
        String data = "amount=" + amount + "&cancelUrl=" + cancelUrl + "&description=" + description
                + "&orderCode=" + orderCode + "&returnUrl=" + returnUrl;
        return hmacSha256(data, checksumKey);
    }

    /** Chữ ký của phần "data" (webhook, phản hồi của payOS). */
    public static String forData(Map<String, ?> data, String checksumKey) {
        return hmacSha256(canonical(data), checksumKey);
    }

    /** So chữ ký nhận được với chữ ký tự tính (so sánh thời gian cố định để không lộ thông tin). */
    public static boolean matches(Map<String, ?> data, String signature, String checksumKey) {
        if (data == null || signature == null || checksumKey == null || checksumKey.isBlank()) return false;
        byte[] expected = forData(data, checksumKey).getBytes(StandardCharsets.US_ASCII);
        byte[] actual = signature.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, actual);
    }

    /** "key1=value1&amp;key2=value2..." với key sắp theo alphabet. */
    static String canonical(Map<String, ?> data) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, ?> e : new TreeMap<String, Object>(data).entrySet()) {
            if (sb.length() > 0) sb.append('&');
            sb.append(e.getKey()).append('=').append(text(e.getValue()));
        }
        return sb.toString();
    }

    private static String text(Object v) {
        if (v == null) return "";
        if (v instanceof String s) return "null".equals(s) || "undefined".equals(s) ? "" : s;
        if (v instanceof Double || v instanceof Float || v instanceof BigDecimal) {
            return new BigDecimal(v.toString()).stripTrailingZeros().toPlainString();
        }
        if (v instanceof Map<?, ?> || v instanceof Collection<?>) return json(v);
        return v.toString();
    }

    /** JSON gọn (key của object sắp theo alphabet, mảng giữ thứ tự) cho trường lồng nhau. */
    private static String json(Object v) {
        if (v == null) return "null";
        if (v instanceof String s) return quote(s);
        if (v instanceof Number || v instanceof Boolean) return text(v);
        StringBuilder sb = new StringBuilder();
        if (v instanceof Map<?, ?> m) {
            sb.append('{');
            TreeMap<String, Object> sorted = new TreeMap<>();
            m.forEach((k, val) -> sorted.put(String.valueOf(k), val));
            sorted.forEach((k, val) -> {
                if (sb.length() > 1) sb.append(',');
                sb.append(quote(k)).append(':').append(json(val));
            });
            return sb.append('}').toString();
        }
        if (v instanceof Collection<?> c) {
            sb.append('[');
            for (Object item : c) {
                if (sb.length() > 1) sb.append(',');
                sb.append(json(item));
            }
            return sb.append(']').toString();
        }
        return quote(v.toString());
    }

    private static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char ch : s.toCharArray()) {
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < 0x20) sb.append(String.format("\\u%04x", (int) ch));
                    else sb.append(ch);
                }
            }
        }
        return sb.append('"').toString();
    }

    static String hmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(raw.length * 2);
            for (byte b : raw) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Máy chủ không hỗ trợ HmacSHA256", e);
        }
    }
}
