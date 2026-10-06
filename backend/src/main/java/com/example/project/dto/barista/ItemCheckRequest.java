package com.example.project.dto.barista;

import jakarta.validation.constraints.NotNull;

/** Tích / bỏ tích 1 món đã pha xong trên bảng pha chế. Body: { "done": true } */
public record ItemCheckRequest(@NotNull(message = "Thiếu trạng thái tích món") Boolean done) {}
