package com.example.project.service;

import com.example.project.repository.OrderRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Sinh mã đơn: không trùng khi tạo cùng lúc, mã của đơn đã hủy không được cấp lại. */
class OrderNumberTest {

    private final String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));

    private OrderSupportService support(OrderRepository orders) {
        return new OrderSupportService(null, orders, null, null, null, null, null);
    }

    @Test
    void cancelledOrderStillCounted_nextCodeIsNew() {
        OrderRepository orders = mock(OrderRepository.class);
        // 5 đơn hôm nay, trong đó có đơn đã hủy (vẫn nằm trong DB nên vẫn được đếm)
        when(orders.countByOrderNumberStartingWith(today + "-")).thenReturn(5L);
        assertEquals(today + "-0006", support(orders).nextOrderNumber());
    }

    @Test
    void ordersNotYetSaved_stillGetDifferentCodes() {
        OrderRepository orders = mock(OrderRepository.class);
        // Đơn trước chưa kịp lưu vào DB: phép đếm vẫn ra 3 cho cả 3 lần gọi
        when(orders.countByOrderNumberStartingWith(anyString())).thenReturn(3L);
        OrderSupportService s = support(orders);
        assertEquals(today + "-0004", s.nextOrderNumber());
        assertEquals(today + "-0005", s.nextOrderNumber());
        assertEquals(today + "-0006", s.nextOrderNumber());
    }

    @Test
    void manyOrdersAtTheSameTime_noDuplicateCode() throws Exception {
        OrderRepository orders = mock(OrderRepository.class);
        when(orders.countByOrderNumberStartingWith(anyString())).thenReturn(0L);
        OrderSupportService s = support(orders);
        Set<String> codes = ConcurrentHashMap.newKeySet();
        int n = 50;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < n; i++) {
            pool.submit(() -> {
                start.await();
                codes.add(s.nextOrderNumber());
                return null;
            });
        }
        start.countDown();
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        assertEquals(n, codes.size());
    }
}
