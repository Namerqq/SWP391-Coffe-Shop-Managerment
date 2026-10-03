package com.example.project.dto.cashier;

import com.example.project.dto.order.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Bán mang đi: khách trả tiền trước, tạo đơn + thanh toán cùng lúc. */
public record TakeawayRequest(
        @NotEmpty(message = "Chưa chọn món nào") List<@Valid OrderItemRequest> items,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,
        @NotBlank(message = "Vui lòng chọn cách thanh toán")
        @Pattern(regexp = "CASH|BANK_TRANSFER", message = "Cách thanh toán chỉ là Tiền mặt hoặc Chuyển khoản")
        String method,
        Long customerId,
        @Min(value = 0, message = "Số điểm dùng không hợp lệ") Integer pointsToRedeem
) {}
