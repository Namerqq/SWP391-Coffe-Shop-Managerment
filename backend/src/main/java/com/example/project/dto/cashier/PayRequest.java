package com.example.project.dto.cashier;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * Thanh toán: method = CASH | BANK_TRANSFER. customerId, pointsToRedeem không bắt buộc.
 * orderIds = các đơn muốn thu (bỏ trống = mọi đơn chưa thanh toán của bàn); đơn ở trạng thái phục vụ nào cũng được.
 * expectedSubtotal = tạm tính thu ngân đang thấy; đơn vừa bị sửa làm tiền khác đi thì backend báo lại (409).
 */
public record PayRequest(
        @NotBlank(message = "Vui lòng chọn cách thanh toán")
        @Pattern(regexp = "CASH|BANK_TRANSFER", message = "Cách thanh toán chỉ là Tiền mặt hoặc Chuyển khoản")
        String method,
        Long customerId,
        @Min(value = 0, message = "Số điểm dùng không hợp lệ") Integer pointsToRedeem,
        List<Long> orderIds,
        @Min(value = 0, message = "Số tiền không hợp lệ") Long expectedSubtotal
) {}
