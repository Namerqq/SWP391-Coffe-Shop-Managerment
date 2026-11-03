package com.example.project.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** API có dữ liệu theo phiên: không lưu response, kể cả lỗi 410, trong cache trình duyệt/proxy. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class NoCacheApiFilter extends OncePerRequestFilter {
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getServletPath().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
        response.setDateHeader(HttpHeaders.EXPIRES, 0);
        // Giữ các Vary khác (ví dụ Origin do CORS thêm), không ghi đè chúng.
        response.addHeader(HttpHeaders.VARY, "X-Guest-Token, Authorization");
        chain.doFilter(request, response);
    }
}
