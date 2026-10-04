package com.example.project.service;

import com.example.project.dto.order.OrderView;
import com.example.project.entity.Order;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.OrderLockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    /** Các đơn khách đã gửi trong phiên này, mới nhất trước. */
    public List<OrderView> myOrders(String token) {
        return tableOrders.views(guests.require(token).orderIds());
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
