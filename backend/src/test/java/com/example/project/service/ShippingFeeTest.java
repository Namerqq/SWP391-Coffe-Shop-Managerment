package com.example.project.service;

import com.example.project.entity.Delivery;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Payment;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Phí ship đơn online: tiền phục vụ còn phải thu và phí ship in trên hóa đơn. */
class ShippingFeeTest {

    private static Order deliveryOrder(long itemsTotal) {
        MenuItem m = new MenuItem();
        m.setName("Bạc xỉu");
        OrderItem i = new OrderItem();
        i.setMenuItem(m);
        i.setQuantity(1);
        i.setItemStatus(OrderItem.PENDING);
        i.setSubtotal(itemsTotal);
        Order o = new Order();
        o.setFulfillmentType(Order.DELIVERY);
        o.setStatus(Order.CONFIRMED);
        i.setOrder(o);
        o.getItems().add(i);
        o.recalcTotal();
        return o;
    }

    private static void pay(Order o, long amount) {
        Payment p = new Payment();
        p.setTotalAmount(amount);
        p.setPaymentStatus(Payment.PAID);
        o.markPaid(p);
    }

    @Test
    void codOrderCollectsItemsPlusShipping() {
        assertEquals(83000L, OnlineOrderService.amountToCollect(deliveryOrder(58000), 25000));
    }

    @Test
    void qrOrderPaidWithShippingCollectsNothing() {
        Order o = deliveryOrder(58000);
        pay(o, 83000);
        assertEquals(0L, OnlineOrderService.amountToCollect(o, 25000));
    }

    @Test
    void oldQrOrderPaidOnlyItemsStillCollectsShipping() {
        Order o = deliveryOrder(58000);
        pay(o, 58000);
        assertEquals(25000L, OnlineOrderService.amountToCollect(o, 25000));
    }

    @Test
    void cancelledOrderCollectsNothing() {
        Order o = deliveryOrder(58000);
        o.setStatus(Order.CANCELLED);
        assertEquals(0L, OnlineOrderService.amountToCollect(o, 25000));
    }

    @Test
    void receiptShippingUsesStoredFeeOrWhatWasPaidAboveItems() {
        Delivery d = new Delivery();
        d.setShippingFee(25000L);
        assertEquals(25000L, OnlineOrderService.shippingPaid(d, 83000, 58000, false));
        assertEquals(25000L, OnlineOrderService.shippingPaid(d, 83000, 0, true));

        Delivery old = new Delivery(); // đơn cũ chưa chốt phí ship
        assertEquals(0L, OnlineOrderService.shippingPaid(old, 58000, 58000, false));
        assertEquals(0L, OnlineOrderService.shippingPaid(null, 58000, 58000, false));
    }
}
