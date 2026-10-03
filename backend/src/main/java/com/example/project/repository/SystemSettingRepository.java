package com.example.project.repository;

import com.example.project.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
    List<SystemSetting> findAllByOrderByGroupNameAscSortOrderAsc();
}
