package com.example.project.service;

import com.example.project.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Hết ngày (mốc 0h) xử lý các đơn còn dở của những ngày trước, quy tắc ở EndOfDayOrderService.
 * Mốc luôn là 0h hôm nay nên chạy lại nhiều lần vẫn an toàn. Chạy đầu mỗi giờ (có lúc 0h) và lúc khởi động
 * để bù khi máy tắt lúc 0h, hoặc khi đơn lúc đó đang chờ quét QR.
 */
@Component
@ConditionalOnProperty(name = "app.order.end-of-day.enabled", havingValue = "true", matchIfMissing = true)
public class EndOfDayOrderJob {

    private static final Logger log = LoggerFactory.getLogger(EndOfDayOrderJob.class);

    private final OrderRepository orderRepository;
    private final EndOfDayOrderService service;

    public EndOfDayOrderJob(OrderRepository orderRepository, EndOfDayOrderService service) {
        this.orderRepository = orderRepository;
        this.service = service;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        run();
    }

    @Scheduled(cron = "${app.order.end-of-day.cron:0 0 * * * *}")
    public void onSchedule() {
        run();
    }

    /** Trả về số đơn vừa có món bị hủy. Lỗi không được làm hỏng ứng dụng, lần chạy sau sẽ thử lại. */
    public int run() {
        LocalDateTime cutoff = LocalDate.now().atStartOfDay();
        List<Long> ids;
        try {
            ids = orderRepository.findIdsByStatusInAndCreatedAtBefore(EndOfDayOrderService.OPEN_STATUSES, cutoff);
        } catch (Exception e) {
            log.warn("Không đọc được đơn cần xử lý cuối ngày: {}", e.getMessage());
            return 0;
        }
        int closed = 0;
        for (Long id : ids) {
            try {
                if (service.closeOverdueOrder(id, cutoff)) closed++;
            } catch (Exception e) {
                log.warn("Không xử lý được đơn {} cuối ngày: {}", id, e.getMessage());
            }
        }
        if (closed > 0) log.info("Cuối ngày: đã hủy món của {} đơn tạo trước {}.", closed, cutoff);
        return closed;
    }
}
