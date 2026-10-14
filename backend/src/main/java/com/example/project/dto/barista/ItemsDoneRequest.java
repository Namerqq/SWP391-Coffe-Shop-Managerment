package com.example.project.dto.barista;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Tích xong nhiều món một lần (ô tích ở "Tổng cần pha"). Body: { "itemIds": [3, 7, 9] }.
 * Frontend gửi đúng các món đang hiện trên màn hình, để món của đơn mới vừa đến không bị tích nhầm.
 */
public record ItemsDoneRequest(
        @NotEmpty(message = "Chưa chọn món nào") @Size(max = 200, message = "Tối đa 200 món mỗi lần")
        List<@NotNull Long> itemIds
) {}
