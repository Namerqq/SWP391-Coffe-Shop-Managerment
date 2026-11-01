package com.example.project.dto.onlinepay;

import com.example.project.dto.cashier.QrTakeawayCart;

import java.util.List;

/**
 * Giỏ hàng của khách đặt online, lưu kèm mã QR (cột cart_json, target_type = ONLINE).
 * Giống giỏ mang đi (QrTakeawayCart) nhưng có thêm thông tin giao hàng. Lúc tạo mã CHƯA có đơn:
 * khách trả xong hệ thống mới tạo đơn ONLINE / DELIVERY từ giỏ này, đúng giá lúc tạo mã.
 * customerPhone luôn có (là SĐT nhận hàng), kể cả khi khách không phải thành viên.
 * shippingFee: phí ship chốt lúc tạo mã, đã cộng vào số tiền của mã (subtotal / amount của mã = tiền món + ship).
 * Mã tạo trước khi gồm ship không có trường này (null = 0).
 */
public record QrOnlineCart(String customerName, String customerPhone, String deliveryAddress, String note,
                           List<QrTakeawayCart.Line> lines, Long shippingFee) {

    public long shippingFeeOrZero() {
        return shippingFee == null ? 0 : shippingFee;
    }

    public int itemCount() {
        return lines == null ? 0 : lines.stream().mapToInt(l -> l.quantity() == null ? 0 : l.quantity()).sum();
    }
}
