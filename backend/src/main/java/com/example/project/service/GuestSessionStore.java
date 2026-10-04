package com.example.project.service;

import com.example.project.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phiên gọi món của khách tại bàn (không cần đăng nhập).
 * Quét QR -> server cấp 1 mã (token) gắn với bàn; frontend gửi lại qua header "X-Guest-Token".
 * Lưu trong bộ nhớ 8 giờ: khởi động lại backend thì khách quét lại QR (đơn trong DB không mất).
 */
@Component
public class GuestSessionStore {

    public static final String HEADER = "X-Guest-Token";
    private static final long TTL_MS = 8L * 60 * 60 * 1000;

    /** 1 phiên khách: bàn đang ngồi, các đơn đã gửi, requestKey -> orderId để chống gửi trùng. */
    public static final class Guest {
        private final long tableId;
        private final Set<Long> orderIds = ConcurrentHashMap.newKeySet();
        private final Map<String, Long> requests = new ConcurrentHashMap<>();
        private volatile long expiresAt;

        Guest(long tableId) {
            this.tableId = tableId;
            touch();
        }

        void touch() { this.expiresAt = System.currentTimeMillis() + TTL_MS; }
        boolean expired() { return System.currentTimeMillis() > expiresAt; }
        public long tableId() { return tableId; }
        public Set<Long> orderIds() { return orderIds; }
        public Map<String, Long> requests() { return requests; }
    }

    private final Map<String, Guest> guests = new ConcurrentHashMap<>();

    public String create(long tableId) {
        guests.entrySet().removeIf(e -> e.getValue().expired());
        String token = UUID.randomUUID().toString().replace("-", "");
        guests.put(token, new Guest(tableId));
        return token;
    }

    /** Phiên còn hạn, không có thì null. */
    public Guest find(String token) {
        if (token == null || token.isBlank()) return null;
        Guest g = guests.get(token);
        if (g == null) return null;
        if (g.expired()) {
            guests.remove(token);
            return null;
        }
        g.touch();
        return g;
    }

    /** Bắt buộc có phiên. Trả 410 (không phải 401) để trang khách không bị chuyển sang trang đăng nhập nhân viên. */
    public Guest require(String token) {
        Guest g = find(token);
        if (g == null) {
            throw new ApiException(HttpStatus.GONE, "Phiên gọi món đã hết hạn. Vui lòng quét lại mã QR trên bàn.");
        }
        return g;
    }
}
