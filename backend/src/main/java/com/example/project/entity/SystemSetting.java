package com.example.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** ENTITY = 1 dòng trong bảng "system_settings" (tạo bởi database/V3__system_settings.sql). */
@Entity
@Table(name = "system_settings")
public class SystemSetting {

    @Id
    @Column(name = "setting_key", length = 80)
    private String key;

    @Column(name = "setting_value", nullable = false, length = 500)
    private String value;

    /** STRING | NUMBER | TIME | BOOLEAN | EMAIL */
    @Column(name = "data_type", nullable = false, length = 20)
    private String dataType;

    /** GENERAL | SALES | SECURITY */
    @Column(name = "group_name", nullable = false, length = 30)
    private String groupName;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(length = 255)
    private String description;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "updated_by", length = 50)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = LocalDateTime.now();
    }

    public String getKey() { return key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
    public String getDataType() { return dataType; }
    public String getGroupName() { return groupName; }
    public String getLabel() { return label; }
    public String getDescription() { return description; }
    public Integer getSortOrder() { return sortOrder; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
