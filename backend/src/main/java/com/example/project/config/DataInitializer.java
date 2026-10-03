package com.example.project.config;

import com.example.project.entity.Role;
import com.example.project.entity.User;
import com.example.project.repository.RoleRepository;
import com.example.project.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Lần chạy đầu: nếu DB chưa có Admin nào thì tạo 1 tài khoản Admin mặc định
 * (vì password_hash phải là BCrypt nên không insert sẵn bằng SQL được).
 * ĐỔI MẬT KHẨU ngay sau khi đăng nhập lần đầu.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String username;
    @Value("${app.admin.email:admin@cafeshop.local}")
    private String email;
    @Value("${app.admin.password:Admin@123}")
    private String password;

    public DataInitializer(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        Role admin = roleRepository.findByName("ADMIN").orElse(null);
        if (admin == null) {
            log.warn("Chưa có role ADMIN. Hãy chạy database/V2__reference_data.sql.");
            return;
        }
        boolean hasAdmin = userRepository.countByRole_NameAndStatus("ADMIN", User.ACTIVE) > 0
                || userRepository.existsByUsernameIgnoreCase(username);
        if (hasAdmin) return;

        User u = new User();
        u.setRole(admin);
        u.setFullName("Quản trị viên");
        u.setUsername(username);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(u);
        log.warn("Đã tạo tài khoản Admin mặc định '{}'. Hãy đổi mật khẩu ngay!", username);
    }
}
