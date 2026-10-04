package com.example.project.repository;

import com.example.project.entity.TableSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TableSessionRepository extends JpaRepository<TableSession, Long> {
    List<TableSession> findByStatusInOrderByOpenedAtAsc(Collection<String> statuses);
    Optional<TableSession> findFirstByTable_IdAndStatusIn(Long tableId, Collection<String> statuses);
    long countBySessionCodeStartingWith(String prefix);
}
