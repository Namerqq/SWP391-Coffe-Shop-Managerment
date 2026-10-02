package com.example.project.repository;

import com.example.project.entity.TableSession;
import com.example.project.entity.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.Optional;

public interface TableSessionRepository extends JpaRepository<TableSession, Long> {
    /** Session đang hoạt động của bàn (OPEN hoặc PAYMENT_PENDING) - DB đảm bảo tối đa 1 dòng. */
    Optional<TableSession> findFirstByTableIdAndStatusIn(Long tableId, Collection<SessionStatus> statuses);
}
