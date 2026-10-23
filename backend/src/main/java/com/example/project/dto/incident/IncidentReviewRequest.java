package com.example.project.dto.incident;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Quản lý xử lý biên bản sự cố: mức phạt (0 = không phạt) và ghi chú. */
public record IncidentReviewRequest(
        @NotNull(message = "Vui lòng nhập mức phạt (nhập 0 nếu không phạt).")
        @Min(value = 0, message = "Mức phạt không được âm.")
        @Max(value = 10000000, message = "Mức phạt tối đa 10.000.000đ.")
        Long penaltyAmount,

        @Size(max = 300, message = "Ghi chú tối đa 300 ký tự.")
        String managerNote
) {}
