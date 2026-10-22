package com.example.project.service;

import com.example.project.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phiên gọi món của khách tại bàn (không cần đăng nhập).
 * Quét QR -> server cấp 1 mã (token) gắn với bàn; frontend gửi lại qua header "X-Guest-Token".
 * Lưu trong bộ nhớ 8 giờ: khởi động lại backend thì khách quét lại QR (đơn trong DB không mất).
 *
 * Khi khách gửi đơn đầu tiên, phiên được gắn với lượt khách của bàn (table_session).
 * Lượt đó xong (mọi đơn đã phục vụ + đã thanh toán) thì phiên của khách KẾT THÚC:
 * không xem lại đơn cũ, không gọi thêm vào bàn được nữa, phải quét lại QR để mở phiên mới.
 * Lượt bị hủy (khách hủy hết đơn) thì phiên vẫn giữ, khách gọi tiếp được.
 */
@Component
public class GuestSessionStore {

    public static final String HEADER = "X-Guest-Token";
    /** Mã lỗi trả cho frontend khi lượt khách đã kết thúc (để hiện lời cảm ơn và xóa dữ liệu trên máy). */
    public static final String ENDED_CODE = "GUEST_SESSION_ENDED";
    private static final long TTL_MS = 8L * 60 * 60 * 1000;

    /** 1 phiên khách: bàn đang ngồi, lượt khách đang gắn, các đơn đã gửi, requestKey -> orderId để chống gửi trùng. */
    public static final class Guest {
        private final long tableId;
        private final Set<Long> orderIds = ConcurrentHashMap.newKeySet();
        private final Map<String, Long> requests = new ConcurrentHashMap<>();
        private volatile Long tableSessionId;
        private volatile boolean ended;
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
        public Long tableSessionId() { return tableSessionId; }
        public boolean ended() { return ended; }

        /** Gắn phiên với lượt khách mà đơn vừa gửi thuộc về. */
        public void attach(Long sessionId) {
            if (sessionId != null) this.tableSessionId = sessionId;
        }

        /** Kết thúc phiên: xóa danh sách đơn để không ai xem lại được nữa. */
        synchronized void end() {
            this.ended = true;
            orderIds.clear();
            requests.clear();
        }
    }

    private final Map<String, Guest> guests = new ConcurrentHashMap<>();

    public String create(long tableId) {
        guests.entrySet().removeIf(e -> e.getValue().expired());
        String token = UUID.randomUUID().toString().replace("-", "");
        guests.put(token, new Guest(tableId));
        return token;
    }

    /** Phiên theo token (còn hạn, có thể đã kết thúc), không có thì null. */
    private Guest lookup(String token) {
        if (token == null || token.isBlank()) return null;
        Guest g = guests.get(token);
        if (g == null) return null;
        if (g.expired()) {
            guests.remove(token);
            return null;
        }
        return g;
    }

    /** Phiên còn hạn và chưa kết thúc, không có thì null. */
    public Guest find(String token) {
        Guest g = lookup(token);
        if (g == null || g.ended()) return null;
        g.touch();
        return g;
    }

    /** Token này thuộc 1 lượt khách đã xong (đã phục vụ + đã thanh toán). */
    public boolean isEnded(String token) {
        Guest g = lookup(token);
        return g != null && g.ended();
    }

    /** Bắt buộc có phiên. Trả 410 (không phải 401) để trang khách không bị chuyển sang trang đăng nhập nhân viên. */
    public Guest require(String token) {
        Guest g = lookup(token);
        if (g != null && g.ended()) throw endedError();
        if (g == null) {
            throw new ApiException(HttpStatus.GONE, "Phiên gọi món đã hết hạn. Vui lòng quét lại mã QR trên bàn.");
        }
        g.touch();
        return g;
    }

    /** Lỗi 410 kèm mã ENDED_CODE: lượt khách đã xong. */
    public static ApiException endedError() {
        return new ApiException(HttpStatus.GONE, ENDED_CODE,
                "Cảm ơn quý khách! Vui lòng quét lại mã QR trên bàn để gọi món mới.");
    }

    /**
     * Lượt khách vừa đóng (đã phục vụ + đã thanh toán) -> kết thúc mọi phiên khách gắn với lượt đó.
     * Đang trong transaction thì chỉ kết thúc SAU KHI commit thành công (rollback thì phiên khách vẫn giữ).
     */
    public void endTableSession(Long tableSessionId) {
        if (tableSessionId == null) return;
        Runnable endAll = () -> guests.values().forEach(g -> {
            if (tableSessionId.equals(g.tableSessionId())) g.end();
        });
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    endAll.run();
                }
            });
        } else {
            endAll.run();
        }
    }
}
