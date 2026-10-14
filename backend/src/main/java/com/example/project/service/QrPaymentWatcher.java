package com.example.project.service;

import com.example.project.dto.cashier.QrPaymentView;
import com.example.project.entity.QrPaymentRequest;
import com.example.project.exception.ApiException;
import com.example.project.payos.PayosClient;
import com.example.project.payos.PayosException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Theo dõi các mã QR đang chờ, làm việc với payOS NGOÀI transaction rồi nhờ QrPaymentService ghi DB.
 * Hệ thống biết khách đã trả bằng 2 đường (dùng song song):
 * 1) Webhook: payOS gọi POST /api/public/payos/webhook ngay khi tiền về (cần địa chỉ công khai, vd ngrok).
 * 2) Hỏi định kỳ: cứ app.payos.poll-interval-ms (mặc định 3 giây) hỏi payOS trạng thái từng mã đang chờ.
 *    Chạy được cả khi backend ở localhost và khi cả nhóm dùng chung 1 kênh payOS (webhook chỉ về 1 máy).
 * Cả 2 đường đều hỏi lại payOS trạng thái link trước khi ghi nhận, nên khách chuyển thiếu không bị tính là đã trả.
 */
@Service
public class QrPaymentWatcher {

    private static final Logger log = LoggerFactory.getLogger(QrPaymentWatcher.class);
    /** Cho thêm vài giây sau giờ hết hạn: giao dịch khách bấm đúng lúc cuối vẫn kịp được ghi nhận. */
    private static final long EXPIRY_GRACE_SECONDS = 15;

    private final QrPaymentService qr;
    private final PayosClient payos;
    private boolean tableMissingLogged;

    public QrPaymentWatcher(QrPaymentService qr, PayosClient payos) {
        this.qr = qr;
        this.payos = payos;
    }

    /** Thu ngân bấm "Hủy mã QR". Nếu khách vừa trả xong đúng lúc đó thì ghi nhận thanh toán thay vì hủy. */
    public QrPaymentView cancel(Long id) {
        QrPaymentService.Snapshot s = qr.snapshot(id);
        if (!QrPaymentRequest.PENDING.equals(s.status())) return qr.view(id);
        if (payos.isConfigured()) {
            try {
                payos.cancelLink(s.orderCode(), "Thu ngân hủy mã QR");
            } catch (PayosException e) {
                PayosClient.LinkInfo info = tryGetLink(s.orderCode());
                if (info != null && info.isPaid()) return qr.applyPaid(id, "CANCEL_CHECK", info.reference());
                if (info == null || !info.isClosed()) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "Không hủy được mã QR trên payOS: " + e.getMessage());
                }
            }
        }
        return qr.markClosed(id, QrPaymentRequest.CANCELLED, "Thu ngân hủy mã QR.");
    }

    /** payOS gọi về khi có giao dịch. Chữ ký sai -> PayosException (controller bỏ qua và ghi log). */
    public void handleWebhook(String rawBody) {
        PayosClient.WebhookPayload w = payos.verifyWebhook(rawBody);
        Optional<QrPaymentService.Snapshot> s = qr.snapshotByOrderCode(w.orderCode());
        if (s.isEmpty()) {
            // payOS gửi dữ liệu mẫu khi đăng ký webhook, hoặc mã do máy khác trong nhóm tạo (dùng chung kênh).
            log.info("Webhook payOS: orderCode {} không có trong hệ thống này, bỏ qua.", w.orderCode());
            return;
        }
        sync(s.get(), "WEBHOOK", w);
    }

    /** Hỏi payOS trạng thái các mã đang chờ (dự phòng khi webhook không tới được). */
    @Scheduled(fixedDelayString = "${app.payos.poll-interval-ms:3000}", initialDelayString = "${app.payos.poll-initial-delay-ms:10000}")
    public void poll() {
        List<QrPaymentService.Snapshot> pending;
        try {
            pending = qr.pendingSnapshots();
            tableMissingLogged = false;
        } catch (DataAccessException e) {
            if (!tableMissingLogged) {
                log.warn("Chưa đọc được bảng qr_payment_requests (đã chạy database/V7__qr_payment_payos.sql chưa?): {}",
                        e.getMostSpecificCause().getMessage());
                tableMissingLogged = true;
            }
            return;
        }
        for (QrPaymentService.Snapshot s : pending) {
            try {
                sync(s, "POLLING", null);
            } catch (Exception e) {
                log.warn("Không đồng bộ được mã QR {} (orderCode {}): {}", s.id(), s.orderCode(), e.getMessage());
            }
        }
    }

    private void sync(QrPaymentService.Snapshot s, String via, PayosClient.WebhookPayload webhook) {
        boolean pending = QrPaymentRequest.PENDING.equals(s.status());
        boolean closedHere = QrPaymentRequest.EXPIRED.equals(s.status()) || QrPaymentRequest.CANCELLED.equals(s.status());
        if (!pending && !(webhook != null && closedHere)) return; // đã PAID / MISMATCH: không làm gì nữa

        LocalDateTime now = LocalDateTime.now();
        boolean timeUp = now.isAfter(s.expiresAt().plusSeconds(EXPIRY_GRACE_SECONDS));
        if (!payos.isConfigured()) {
            if (pending && timeUp) qr.markClosed(s.id(), QrPaymentRequest.EXPIRED, "Hết thời gian chờ.");
            return;
        }

        PayosClient.LinkInfo info;
        try {
            info = payos.getLink(s.orderCode());
        } catch (PayosException e) {
            // Không hỏi được payOS: webhook đã kiểm chữ ký và báo đủ tiền thì vẫn ghi nhận.
            if (webhook != null && webhook.success() && webhook.amount() >= s.amount()) {
                qr.applyPaid(s.id(), via, webhook.reference());
            } else if (pending && now.isAfter(s.expiresAt().plusMinutes(2))) {
                qr.markClosed(s.id(), QrPaymentRequest.EXPIRED, "Hết thời gian chờ (không hỏi được payOS: " + e.getMessage() + ")");
            }
            return;
        }

        if (info.isPaid()) {
            String reference = webhook != null && webhook.reference() != null ? webhook.reference() : info.reference();
            qr.applyPaid(s.id(), via, reference);
            return;
        }
        if (!pending) return; // mã đã đóng ở hệ thống này và payOS cũng chưa nhận đủ tiền
        if (info.isClosed()) {
            String status = "CANCELLED".equals(info.status()) ? QrPaymentRequest.CANCELLED : QrPaymentRequest.EXPIRED;
            qr.markClosed(s.id(), status, "payOS báo mã đã " + ("CANCELLED".equals(info.status()) ? "bị hủy." : "hết hạn."));
            return;
        }
        if (!timeUp) return; // vẫn trong thời gian chờ

        // Hết giờ mà payOS vẫn chờ: hủy link trên payOS để khách không trả vào mã cũ nữa, rồi kiểm tra lần cuối.
        try {
            payos.cancelLink(s.orderCode(), "Hết thời gian chờ");
        } catch (PayosException ignored) {
            // có thể payOS đã tự hết hạn hoặc khách vừa trả xong -> kiểm tra lại ngay bên dưới
        }
        PayosClient.LinkInfo last = tryGetLink(s.orderCode());
        if (last != null && last.isPaid()) {
            qr.applyPaid(s.id(), via, last.reference());
        } else if (last != null && last.amountPaid() > 0) {
            qr.markMismatch(s.id(), "Khách chuyển thiếu: payOS mới nhận " + money(last.amountPaid()) + " trên "
                    + money(s.amount()) + ". Kiểm tra app ngân hàng và xử lý tay.");
        } else {
            qr.markClosed(s.id(), QrPaymentRequest.EXPIRED, "Hết thời gian chờ.");
        }
    }

    private PayosClient.LinkInfo tryGetLink(long orderCode) {
        try {
            return payos.getLink(orderCode);
        } catch (PayosException e) {
            log.warn("Không hỏi được trạng thái mã QR orderCode {} trên payOS: {}", orderCode, e.getMessage());
            return null;
        }
    }

    private static String money(long v) {
        return String.format("%,d", v).replace(',', '.') + "đ";
    }
}
