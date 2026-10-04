package com.example.project.security;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lưu phiên đăng nhập trong bộ nhớ: token ngẫu nhiên -> userId.
 * Đơn giản, đủ dùng cho 1 server. Khởi động lại backend thì mọi người phải đăng nhập lại.
 */
@Component
public class TokenStore {

    private record Session(Long userId, Instant expiresAt) {}

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String create(Long userId, long timeoutMinutes) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sessions.put(token, new Session(userId, Instant.now().plusSeconds(timeoutMinutes * 60)));
        return token;
    }

    /** Trả về userId nếu token còn hạn, đồng thời gia hạn thêm (phiên trượt). */
    public Optional<Long> resolve(String token, long timeoutMinutes) {
        Session s = token == null ? null : sessions.get(token);
        if (s == null) return Optional.empty();
        if (s.expiresAt().isBefore(Instant.now())) {
            sessions.remove(token);
            return Optional.empty();
        }
        sessions.put(token, new Session(s.userId(), Instant.now().plusSeconds(timeoutMinutes * 60)));
        return Optional.of(s.userId());
    }

    public void revoke(String token) {
        if (token != null) sessions.remove(token);
    }

    /** Đăng xuất user khỏi mọi thiết bị (khi bị vô hiệu hóa, đổi vai trò, xóa). */
    public void revokeAllOf(Long userId) {
        sessions.values().removeIf(s -> s.userId().equals(userId));
    }
}
