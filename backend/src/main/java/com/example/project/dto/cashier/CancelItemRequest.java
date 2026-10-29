package com.example.project.dto.cashier;

import jakarta.validation.constraints.Size;

/**
 * Thu ngân bỏ 1 món chưa phục vụ khi thanh toán.
 * reason: lý do (bỏ trống = "Khách không dùng nữa").
 * expectedStatus: trạng thái món thu ngân đang thấy trên màn hình (PENDING / PREPARING / READY), không bắt buộc.
 * Món vừa đổi trạng thái (vd. pha chế vừa pha xong) thì báo 409 để thu ngân xem lại trước khi bỏ.
 */
public record CancelItemRequest(
        @Size(max = 200, message = "Lý do tối đa 200 ký tự") String reason,
        String expectedStatus
) {}
