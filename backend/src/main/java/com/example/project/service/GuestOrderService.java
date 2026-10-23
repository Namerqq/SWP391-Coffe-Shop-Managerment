package com.example.project.service;

import com.example.project.dto.guest.GuestOrderRequest;
import com.example.project.dto.order.OrderView;
import org.springframework.stereotype.Service;

/** UC-CU02 Place Order: khách tại bàn gửi đơn từ giỏ hàng (không cần đăng nhập). */
@Service
public class GuestOrderService {

    private final GuestSessionStore guests;
    private final TableOrderService tableOrders;

    public GuestOrderService(GuestSessionStore guests, TableOrderService tableOrders) {
        this.guests = guests;
        this.tableOrders = tableOrders;
    }

    /**
     * Gửi đơn. Cùng requestKey (gửi lại sau lỗi mạng) thì trả về đơn đã tạo, không tạo đơn mới.
     * Gắn phiên khách với lượt của bàn mà đơn thuộc về: lượt đó xong thì phiên khách kết thúc.
     */
    public OrderView placeOrder(String token, GuestOrderRequest req) {
        GuestSessionStore.Guest g = guests.require(token);
        synchronized (g) {
            // Lượt vừa kết thúc trong lúc chờ khóa -> không cho gọi tiếp bằng phiên cũ.
            if (g.ended()) throw GuestSessionStore.endedError();
            Long existing = g.requests().get(req.requestKey());
            if (existing != null) return tableOrders.view(existing);
            Long id = tableOrders.createDineIn(g.tableId(), req.items(), req.note(), null);
            g.orderIds().add(id);
            g.requests().put(req.requestKey(), id);
            OrderView view = tableOrders.view(id);
            g.attach(view.tableSessionId());
            return view;
        }
    }
}
