package com.example.project.service;

import com.example.project.dto.order.OrderView;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** UC-W08 Confirm Orders as Served: Phục vụ mang món ra bàn, Thu ngân giao đơn mang đi. */
@Service
public class ServingService {

    private final OrderRepository orderRepository;
    private final OrderSupportService support;

    public ServingService(OrderRepository orderRepository, OrderSupportService support) {
        this.orderRepository = orderRepository;
        this.support = support;
    }

    /** Đơn đã pha xong (Chờ mang ra). type = DINE_IN (tại bàn) hoặc PICKUP (mang đi). Chờ lâu nhất ở trên. */
    @Transactional(readOnly = true)
    public List<OrderView> readyOrders(String type) {
        String t = type == null || type.isBlank() ? Order.DINE_IN : type.trim().toUpperCase();
        if (!Order.DINE_IN.equals(t) && !Order.PICKUP.equals(t)) {
            throw ApiException.badRequest("Loại đơn chỉ là DINE_IN hoặc PICKUP.");
        }
        return orderRepository.findByStatusAndFulfillmentTypeOrderByUpdatedAtAsc(Order.READY, t).stream()
                .map(support::toView)
                .toList();
    }

    /** Chờ mang ra -> Đã phục vụ. */
    @Transactional
    public OrderView markServed(Long id) {
        Order o = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn id = " + id));
        if (!Order.READY.equals(o.getStatus())) {
            throw ApiException.badRequest("Đơn " + OrderSupportService.displayNumber(o.getOrderNumber())
                    + " chưa pha xong hoặc đã được mang ra.");
        }
        o.moveTo(Order.SERVED, OrderItem.SERVED);
        o.setCompletedAt(LocalDateTime.now());
        return support.toView(orderRepository.save(o));
    }
}
