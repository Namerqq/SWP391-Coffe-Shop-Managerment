package com.example.project.repository;

import com.example.project.entity.CafeTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CafeTableRepository extends JpaRepository<CafeTable, Long> {
    Optional<CafeTable> findByQrCode(String qrCode);
}
