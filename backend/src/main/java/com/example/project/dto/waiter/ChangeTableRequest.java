package com.example.project.dto.waiter;

import jakarta.validation.constraints.NotNull;

/** Yêu cầu đổi bàn cho khách (chuyển session từ bàn hiện tại sang bàn đích). */
public record ChangeTableRequest(
        @NotNull(message = "Bàn chuyển đến không được để trống")
        Long targetTableId
) {}
