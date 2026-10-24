package com.example.project.dto.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record WasteReportRequest(
        @NotNull(message = "Số lượng hao hụt/hỏng không được để trống")
        @DecimalMin(value = "0.001", message = "Số lượng hao hụt/hỏng phải lớn hơn 0")
        BigDecimal quantity,

        String note,
        String causeType, // "OBJECTIVE", "SUBJECTIVE"
        Long responsibleUserId,
        Integer compensationPercentage,
        String evidenceImageUrl
) {
    public WasteReportRequest(BigDecimal quantity, String note) {
        this(quantity, note, "OBJECTIVE", null, 0, null);
    }
}
