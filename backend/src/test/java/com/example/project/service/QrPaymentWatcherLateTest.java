package com.example.project.service;

import com.example.project.entity.QrPaymentRequest;
import com.example.project.payos.PayosClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Mã đã đóng mà khách vẫn quét lại ảnh chụp: tiền về phải được báo thu ngân, không tự ghi hóa đơn. */
class QrPaymentWatcherLateTest {

    private final QrPaymentService qr = mock(QrPaymentService.class);
    private final PayosClient payos = mock(PayosClient.class);
    private final QrPaymentWatcher watcher = new QrPaymentWatcher(qr, payos);
    private final QrPaymentService.Snapshot expired = new QrPaymentService.Snapshot(
            1L, 100L, 50000L, LocalDateTime.now().minusMinutes(5), QrPaymentRequest.EXPIRED);

    private static PayosClient.LinkInfo link(String status, long paid) {
        return new PayosClient.LinkInfo("x", 100L, 50000L, paid, 50000L - paid, status, "FT1");
    }

    @BeforeEach
    void setUp() {
        when(payos.isConfigured()).thenReturn(true);
        when(qr.recentlyClosedSnapshots(any())).thenReturn(List.of(expired));
    }

    @Test
    void pollClosed_fullyPaidOnPayos_goesThroughApplyPaid() {
        when(payos.getLink(100L)).thenReturn(link("PAID", 50000L));
        watcher.pollClosed();
        verify(qr).applyPaid(1L, "POLLING", "FT1");
    }

    @Test
    void pollClosed_partlyPaid_isReportedAsLate() {
        when(payos.getLink(100L)).thenReturn(link("EXPIRED", 10000L));
        watcher.pollClosed();
        verify(qr).markLatePayment(1L, 10000L, "POLLING", "FT1");
    }

    @Test
    void pollClosed_noMoney_doesNothing() {
        when(payos.getLink(100L)).thenReturn(link("EXPIRED", 0L));
        watcher.pollClosed();
        verify(qr, never()).applyPaid(any(), any(), any());
        verify(qr, never()).markLatePayment(any(), anyLong(), any(), any());
    }
}
