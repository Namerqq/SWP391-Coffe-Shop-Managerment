package com.example.project.repository;

import com.example.project.entity.CafeTable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CafeTableRepository extends JpaRepository<CafeTable, Long> {
    /** Bàn đang hoạt động (không bị tạm ngưng), xếp theo số bàn. */
    List<CafeTable> findByActiveTrueOrderByTableNumberAsc();
}
