package com.example.project.dto.onlinepay;

import com.example.project.dto.order.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Khách đặt online chọn trả bằng QR: gửi giỏ hàng + thông tin giao hàng.
 * Đơn CHƯA được tạo ở bước này (giống mang đi): khách trả xong hệ thống mới tạo đơn ONLINE.
 * Khách online không tích điểm và không dùng điểm (chỉ khách tại quầy mới có).
 */
public record OnlineQrRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự")
        String customerName,

        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^0\\d{9,10}$", message = "Số điện thoại gồm 10-11 chữ số và bắt đầu bằng 0")
        String customerPhone,

        @NotBlank(message = "Vui lòng nhập địa chỉ giao hàng")
        @Size(max = 500, message = "Địa chỉ giao hàng tối đa 500 ký tự")
        String deliveryAddress,

        @Size(max = 500, message = "Ghi chú đơn hàng tối đa 500 ký tự")
        String note,

        @NotEmpty(message = "Giỏ hàng đang trống")
        @Size(max = 30, message = "Mỗi đơn hàng tối đa 30 dòng món")
        List<@Valid OrderItemRequest> items
) {}
