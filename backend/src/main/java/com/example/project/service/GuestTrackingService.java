package com.example.project.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.project.dto.order.OrderView;
import com.example.project.entity.Order;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.OrderLockRepository;

/** UC-CU03 Track Order Status + hủy đơn còn Chờ pha (trạng thái hiển thị giống màn Pha chế / Phục vụ). */
@Service
public class GuestTrackingService {

    private final GuestSessionStore guests;
    private final TableOrderService tableOrders;
    private final OrderLockRepository lockRepository;
    private final OrderSupportService support;

    public GuestTrackingService(GuestSessionStore guests, TableOrderService tableOrders,
                                OrderLockRepository lockRepository, OrderSupportService support) {
        this.guests = guests;
        this.tableOrders = tableOrders;
        this.lockRepository = lockRepository;
        this.support = support;
    }

    /**
     * Các đơn khách đã gửi trong phiên này, mới nhất trước. Đơn chỉ ẩn khi đã xong cả 2 phía:
     * đã thanh toán VÀ (đã phục vụ hoặc đã hủy / hoàn hết). Trả trước mà món chưa ra thì vẫn hiện để khách theo dõi.
     */
    public List<OrderView> myOrders(String token) {
        return tableOrders.views(guests.require(token).orderIds()).stream()
                .filter(order -> !isSettled(order))
                .toList();
    }

    private static boolean isSettled(OrderView order) {
        boolean paid = Order.PAID.equals(order.paymentStatus());
        boolean finished = Order.SERVED.equals(order.status())
                || Order.CANCELLED.equals(order.status()) || Order.REJECTED.equals(order.status());
        return paid && finished;
    }

    /** Khách chỉ hủy được đơn của mình khi đơn còn Chờ pha. Hủy hết đơn thì bàn tự trả về trống. */
    @Transactional
    public OrderView cancel(String token, Long orderId, String reason) {
        GuestSessionStore.Guest g = guests.require(token);
        if (!g.orderIds().contains(orderId)) throw new ResourceNotFoundException("Không tìm thấy đơn hàng.");
        Order o = lockRepository.findWithLockById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng."));
        String r = OrderSupportService.blankToNull(reason);
        support.cancelPendingOrder(o, r == null ? "Khách hủy đơn" : "Khách hủy: " + r);
        return support.toView(o);
    }
}
