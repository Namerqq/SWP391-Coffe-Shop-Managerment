package com.example.project.dto.online;

import com.example.project.dto.order.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * DTO nhận dữ liệu đặt hàng online từ màn hình Guest Checkout.
 * Tái sử dụng OrderItemRequest cho danh sách món (đã có size, topping, đường, đá, ghi chú).
 */
public record OnlineOrderRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự")
        String customerName,

        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng số 0")
        String customerPhone,

        @NotBlank(message = "Vui lòng nhập địa chỉ giao hàng")
        @Size(max = 500, message = "Địa chỉ giao hàng tối đa 500 ký tự")
        String deliveryAddress,

        @Size(max = 500, message = "Ghi chú đơn hàng tối đa 500 ký tự")
        String note,

        @Pattern(regexp = "^(CASH|PAYOS_QR)$", message = "Phương thức thanh toán phải là CASH hoặc PAYOS_QR")
        String paymentMethod,

        @NotEmpty(message = "Giỏ hàng đang trống")
        @Size(max = 30, message = "Mỗi đơn hàng tối đa 30 dòng món")
        List<@Valid OrderItemRequest> items
) {
    public String paymentMethodOrDefault() {
        return (paymentMethod == null || paymentMethod.isBlank()) ? "CASH" : paymentMethod.trim();
    }
}
