package com.example.project.service;

import com.example.project.dto.LoginRequest;
import com.example.project.dto.LoginResponse;
import com.example.project.dto.UserResponse;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.UserRepository;
import com.example.project.security.TokenStore;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final String BAD_CREDENTIALS = "Tên đăng nhập hoặc mật khẩu không đúng.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenStore tokenStore;
    private final SystemSettingService settings;

    /** Đếm số lần nhập sai liên tiếp theo userId. */
    private final Map<Long, Integer> failedAttempts = new ConcurrentHashMap<>();

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       TokenStore tokenStore, SystemSettingService settings) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenStore = tokenStore;
        this.settings = settings;
    }

    public LoginResponse login(LoginRequest req) {
        String id = req.identifier().trim();
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(id, id)
                .orElseThrow(() -> ApiException.unauthorized(BAD_CREDENTIALS));

        // Kiểm tra mật khẩu TRƯỚC, để người ngoài không biết tài khoản có tồn tại / bị khóa hay không.
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            registerFailure(user);
            throw ApiException.unauthorized(BAD_CREDENTIALS);
        }
        failedAttempts.remove(user.getId());

        if (User.LOCKED.equals(user.getStatus())) {
            throw ApiException.forbidden("Tài khoản đã bị khóa do nhập sai mật khẩu nhiều lần. Vui lòng liên hệ Admin.");
        }

        if (User.INACTIVE.equals(user.getStatus())) {
            throw ApiException.forbidden("Tài khoản đã bị vô hiệu hóa.");
        }
        if (settings.maintenanceMode() && !"ADMIN".equals(user.getRole().getName())) {
            throw ApiException.forbidden("Hệ thống đang bảo trì, vui lòng quay lại sau.");
        }

        long timeout = settings.sessionTimeoutMinutes();
        return new LoginResponse(tokenStore.create(user.getId(), timeout), timeout, UserResponse.from(user));
    }

    public void logout(String token) {
        tokenStore.revoke(token);
    }

    /** Admin mở khóa tài khoản thì xóa bộ đếm cũ. */
    public void resetFailures(Long userId) {
        failedAttempts.remove(userId);
    }

    private void registerFailure(User user) {
        long max = settings.maxLoginAttempts();
        int count = failedAttempts.merge(user.getId(), 1, Integer::sum);
        if (max > 0 && count >= max && User.ACTIVE.equals(user.getStatus()) && !isLastActiveAdmin(user)) {
            user.setStatus(User.LOCKED);
            userRepository.save(user);
            failedAttempts.remove(user.getId());
            throw ApiException.forbidden("Bạn đã nhập sai " + max + " lần. Tài khoản đã bị khóa, vui lòng liên hệ Admin.");
        }
    }

    /** Không khóa Admin cuối cùng đang hoạt động, nếu không sẽ không còn ai mở khóa được. */
    private boolean isLastActiveAdmin(User user) {
        return "ADMIN".equals(user.getRole().getName())
                && userRepository.countByRole_NameAndStatus("ADMIN", User.ACTIVE) <= 1;
    }
}
