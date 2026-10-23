package com.example.project.repository;

import com.example.project.entity.IncidentReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentReportRepository extends JpaRepository<IncidentReport, Long> {

    /** Tất cả biên bản, mới nhất lên đầu. */
    List<IncidentReport> findAllByOrderByIdDesc();

    /** Biên bản theo trạng thái (PENDING / REVIEWED), mới nhất lên đầu. */
    List<IncidentReport> findByStatusOrderByIdDesc(String status);

    /** Món này đã từng bị báo sự cố với hướng xử lý action chưa (dùng để hiện nhãn "Pha bù"). */
    boolean existsByOrderItem_IdAndAction(Long orderItemId, String action);

    /** Món này đã có biên bản sự cố chưa (có rồi thì không được xóa món). */
    boolean existsByOrderItem_Id(Long orderItemId);
}
