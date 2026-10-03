package com.example.project.security;

import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.UserRepository;
import com.example.project.service.SystemSettingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;

/**
 * Kiểm tra header "Authorization: Bearer <token>" cho mọi /api/** (trừ /api/auth/login và /api/public/**).
 * - /api/admin/** : bắt buộc vai trò ADMIN.
 * - Controller / hàm có @RequireRole : chỉ các vai trò được liệt kê.
 * - Còn lại : chỉ cần đăng nhập.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String CURRENT_USER = "currentUser";

    private final TokenStore tokenStore;
    private final UserRepository userRepository;
    private final SystemSettingService settings;

    public AuthInterceptor(TokenStore tokenStore, UserRepository userRepository, SystemSettingService settings) {
        this.tokenStore = tokenStore;
        this.userRepository = userRepository;
        this.settings = settings;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true; // CORS preflight

        String token = extractToken(request);
        if (token == null) throw ApiException.unauthorized("Vui lòng đăng nhập.");
        Long userId = tokenStore.resolve(token, settings.sessionTimeoutMinutes())
                .orElseThrow(() -> ApiException.unauthorized("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."));

        // Đọc lại từ DB mỗi lần: tài khoản vừa bị vô hiệu hóa/đổi vai trò sẽ mất quyền ngay.
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !User.ACTIVE.equals(user.getStatus())) {
            tokenStore.revoke(token);
            throw ApiException.unauthorized("Tài khoản không còn hoạt động.");
        }
        String role = user.getRole().getName();
        if (request.getRequestURI().startsWith("/api/admin") && !"ADMIN".equals(role)) {
            throw ApiException.forbidden("Bạn không có quyền truy cập chức năng quản trị.");
        }
        RequireRole required = findRequiredRole(handler);
        if (required != null && Arrays.stream(required.value()).noneMatch(role::equals)) {
            throw ApiException.forbidden("Vai trò của bạn không được dùng chức năng này.");
        }
        request.setAttribute(CURRENT_USER, user);
        return true;
    }

    private static RequireRole findRequiredRole(Object handler) {
        if (!(handler instanceof HandlerMethod hm)) return null;
        RequireRole onMethod = hm.getMethodAnnotation(RequireRole.class);
        return onMethod != null ? onMethod : hm.getBeanType().getAnnotation(RequireRole.class);
    }

    public static String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
    }
}
