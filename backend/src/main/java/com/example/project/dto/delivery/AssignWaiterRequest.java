package com.example.project.dto.delivery;

import jakarta.validation.constraints.NotNull;

/** Body của PUT /api/cashier/delivery-orders/{id}/assign: { "waiterId": 5 } */
public record AssignWaiterRequest(@NotNull(message = "Chọn phục vụ đi giao.") Long waiterId) {}
