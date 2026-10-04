package com.example.project.dto.guest;

import com.example.project.dto.order.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Khách gửi đơn. requestKey do frontend tạo, giữ nguyên khi gửi lại sau lỗi mạng
 * để server không tạo 2 đơn giống nhau.
 */
public record GuestOrderRequest(
        @NotEmpty(message = "Giỏ hàng đang trống") @Size(max = 30, message = "Mỗi đơn tối đa 30 dòng món")
        List<@Valid OrderItemRequest> items,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,
        @NotBlank(message = "Thiếu mã yêu cầu")
        @Pattern(regexp = "[A-Za-z0-9-]{8,64}", message = "Mã yêu cầu không hợp lệ") String requestKey
) {}
