package com.example.project.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Tự vá DB cũ lúc khởi động: nếu bảng deliveries chưa có cột shipping_fee
 * (DB tạo trước khi thêm phí ship) thì tự thêm, để không ai phải chạy ALTER bằng tay.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SchemaPatchInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaPatchInitializer.class);

    private final JdbcTemplate jdbc;

    public SchemaPatchInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()"
                        + " AND TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'shipping_fee'",
                Integer.class);
        if (count != null && count == 0) {
            jdbc.execute("ALTER TABLE deliveries ADD COLUMN shipping_fee BIGINT UNSIGNED NULL");
            log.warn("Đã tự thêm cột deliveries.shipping_fee cho DB cũ.");
        }
    }
}
