package com.example.project.dto;

import com.example.project.entity.SystemSetting;
import java.time.LocalDateTime;

public record SettingResponse(
        String key, String value, String dataType, String groupName,
        String label, String description, String updatedBy, LocalDateTime updatedAt
) {
    public static SettingResponse from(SystemSetting s) {
        return new SettingResponse(s.getKey(), s.getValue(), s.getDataType(), s.getGroupName(),
                s.getLabel(), s.getDescription(), s.getUpdatedBy(), s.getUpdatedAt());
    }
}
