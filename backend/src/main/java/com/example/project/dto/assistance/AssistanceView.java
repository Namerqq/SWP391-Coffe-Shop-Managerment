package com.example.project.dto.assistance;

import java.time.Instant;

public record AssistanceView(String id, Long tableId, String tableNumber, String note,
                             String status, Instant createdAt, Instant updatedAt,
                             Long acceptedById, String acceptedByName) {}
