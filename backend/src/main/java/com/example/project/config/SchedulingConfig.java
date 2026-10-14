package com.example.project.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Bật @Scheduled: QrPaymentWatcher hỏi payOS trạng thái các mã QR đang chờ mỗi vài giây. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
