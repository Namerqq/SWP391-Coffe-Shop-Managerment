package com.example.project.service;

import com.example.project.dto.onlinepay.OnlineReceiptView;
import com.example.project.entity.LoyaltyTransaction;
import com.example.project.entity.Order;
import com.example.project.entity.Payment;
import com.example.project.repository.LoyaltyTransactionRepository;
import com.example.project.repository.OnlineReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Hóa đơn điện tử cho khách đặt online (ThangNN Iter2, D4 + Q3): khách nhập SĐT nhận hàng,
 * chỉ thấy các đơn ONLINE đã thanh toán, tối đa 20 hóa đơn gần nhất, không hiện địa chỉ.
 */
@Service
public class OnlineReceiptService {

    private final OnlineReceiptRepository receiptRepository;
    private final LoyaltyTransactionRepository loyaltyRepository;
    private final OrderSupportService support;
    private final SystemSettingService settings;

    public OnlineReceiptService(OnlineReceiptRepository receiptRepository, LoyaltyTransactionRepository loyaltyRepository,
                                OrderSupportService support, SystemSettingService settings) {
        this.receiptRepository = receiptRepository;
        this.loyaltyRepository = loyaltyRepository;
        this.support = support;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public List<OnlineReceiptView> byPhone(String phone) {
        String p = OnlineLoyaltyService.normalizePhone(phone);
        String shopName = settings.get("shop.name", "Cafe Shop");
        String shopAddress = settings.get("shop.address", "");
        String shopPhone = settings.get("shop.phone", "");
        return receiptRepository
                .findTop20BySourceAndCustomerPhoneAndPaymentStatusOrderByPaidAtDesc(Order.SOURCE_ONLINE, p, Order.PAID)
                .stream()
                .filter(o -> o.getPayment() != null)
                .map(o -> toView(o, shopName, shopAddress, shopPhone))
                .toList();
    }

    private OnlineReceiptView toView(Order o, String shopName, String shopAddress, String shopPhone) {
        Payment pay = o.getPayment();
        long subtotal = o.activeTotal();
        long total = pay.getTotalAmount() == null ? 0 : pay.getTotalAmount();
        int redeemed = 0;
        int earned = 0;
        for (LoyaltyTransaction t : loyaltyRepository.findByPayment_Id(pay.getId())) {
            if (LoyaltyTransaction.REDEEM.equals(t.getTransactionType())) redeemed += -t.getPointsChange();
            else if (LoyaltyTransaction.EARN.equals(t.getTransactionType())) earned += t.getPointsChange();
        }
        return new OnlineReceiptView(shopName, shopAddress, shopPhone,
                OrderSupportService.displayNumber(o.getOrderNumber()), pay.getPaymentCode(), pay.getPaidAt(),
                pay.getPaymentMethod(), o.getCustomerName(),
                o.getItems().stream().map(support::toItemView).toList(),
                subtotal, Math.max(0, subtotal - total), total, redeemed, earned);
    }
}
