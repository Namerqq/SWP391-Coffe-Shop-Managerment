package com.example.project.service;

import com.example.project.dto.onlinepay.OnlineReceiptView;
import com.example.project.entity.Order;
import com.example.project.entity.Payment;
import com.example.project.exception.ApiException;
import com.example.project.repository.OnlineReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hóa đơn điện tử cho khách đặt online (ThangNN Iter2). Khách chỉ xem được hóa đơn của đơn mình nhập mã
 * (không còn tra theo SĐT để liệt kê nhiều đơn). Đơn chưa thanh toán (COD chưa giao) thì chưa có hóa đơn.
 */
@Service
public class OnlineReceiptService {

    private final OnlineReceiptRepository receiptRepository;
    private final OrderSupportService support;
    private final SystemSettingService settings;

    public OnlineReceiptService(OnlineReceiptRepository receiptRepository, OrderSupportService support,
                                SystemSettingService settings) {
        this.receiptRepository = receiptRepository;
        this.support = support;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public OnlineReceiptView byCode(String code) {
        String c = OrderSupportService.normalizeOrderCode(code);
        Order o = receiptRepository.findFirstBySourceAndOrderNumberOrderByIdDesc(Order.SOURCE_ONLINE, c)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn đặt online có mã " + c + "."));
        if (!Order.PAID.equals(o.getPaymentStatus()) || o.getPayment() == null) {
            throw ApiException.badRequest("Đơn " + c + " chưa thanh toán nên chưa có hóa đơn. "
                    + "Hóa đơn có sau khi quán nhận tiền.");
        }
        return toView(o);
    }

    private OnlineReceiptView toView(Order o) {
        Payment pay = o.getPayment();
        long subtotal = o.activeTotal();
        long total = pay.getTotalAmount() == null ? 0 : pay.getTotalAmount();
        return new OnlineReceiptView(settings.get("shop.name", "Cafe Shop"), settings.get("shop.address", ""),
                settings.get("shop.phone", ""),
                o.getOrderNumber(), pay.getPaymentCode(), pay.getPaidAt(), pay.getPaymentMethod(), o.getCustomerName(),
                o.getItems().stream().map(support::toItemView).toList(),
                subtotal, Math.max(0, subtotal - total), total);
    }
}
