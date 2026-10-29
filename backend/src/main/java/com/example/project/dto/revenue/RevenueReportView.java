package com.example.project.dto.revenue;

import java.time.LocalDate;
import java.util.List;

/**
 * UC-RP01 View Order Statistics — màn "Doanh thu" của Quản lý.
 * period = DAY / WEEK / MONTH / YEAR; kỳ đang xem là [from, to] (tính cả 2 ngày).
 * rows: bảng thống kê chia nhỏ kỳ — DAY theo giờ, WEEK / MONTH theo ngày, YEAR theo tháng.
 * topItems: món bán chạy nhất trong kỳ (tối đa 10).
 */
public record RevenueReportView(String period, LocalDate from, LocalDate to, Summary summary,
                                List<Row> rows, List<TopItem> topItems) {

    /**
     * total = cash + transfer (đúng số tiền khách trả, đã trừ giảm giá bằng điểm).
     * previousTotal = doanh thu kỳ liền trước cùng độ dài (hôm qua / tuần trước / tháng trước / năm trước) để so sánh.
     */
    public record Summary(int billCount, long total, long cash, long transfer, long averagePerBill, long previousTotal) {}

    /** 1 dòng bảng thống kê. label: "08:00", "T2 26/10", "26/10", "Tháng 10". */
    public record Row(String label, int billCount, long cash, long transfer, long total) {}

    /** amount = thành tiền theo giá món (chưa trừ giảm giá bằng điểm). */
    public record TopItem(String name, long quantity, long amount) {}
}
