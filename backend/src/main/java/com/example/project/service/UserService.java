package com.example.project.service;

import com.example.project.dto.*;
import com.example.project.entity.Role;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.RoleRepository;
import com.example.project.repository.UserRepository;
import com.example.project.security.TokenStore;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** UC-AD01..AD05: quản lý tài khoản nhân viên. */
@Service
public class UserService {

    private static final String ADMIN = "ADMIN";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenStore tokenStore;
    private final SystemSettingService settings;
    private final AuthService authService;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder,
                       TokenStore tokenStore, SystemSettingService settings, AuthService authService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenStore = tokenStore;
        this.settings = settings;
        this.authService = authService;
    }

    // UC-AD01 View Account List
    public List<UserResponse> search(String keyword, Long roleId, String status) {
        return userRepository.search(blankToNull(keyword), roleId, blankToNull(status))
                .stream().map(UserResponse::from).toList();
    }

    // UC-AD02 View Account Detail
    public UserResponse getById(Long id) {
        return UserResponse.from(findOrThrow(id));
    }

    public List<RoleResponse> getRoles() {
        return roleRepository.findAll().stream().map(RoleResponse::from).toList();
    }

    @Transactional
    public UserResponse create(UserCreateRequest req) {
        checkUnique(req.username(), req.email(), null);
        checkPassword(req.password());
        User u = new User();
        u.setFullName(req.fullName().trim());
        u.setUsername(req.username().trim());
        u.setEmail(req.email().trim().toLowerCase());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setRole(findRole(req.roleId()));
        u.setStatus(User.ACTIVE);
        return UserResponse.from(userRepository.save(u));
    }

    // UC-AD03 Update Account Detail
    @Transactional
    public UserResponse update(Long id, UserUpdateRequest req) {
        User u = findOrThrow(id);
        checkUnique(req.username(), req.email(), id);
        u.setFullName(req.fullName().trim());
        u.setUsername(req.username().trim());
        u.setEmail(req.email().trim().toLowerCase());
        if (req.newPassword() != null && !req.newPassword().isBlank()) {
            checkPassword(req.newPassword());
            u.setPasswordHash(passwordEncoder.encode(req.newPassword()));
            tokenStore.revokeAllOf(id); // đổi mật khẩu -> đăng xuất mọi nơi
        }
        return UserResponse.from(userRepository.save(u));
    }

    // UC-AD04 Assign Role to User
    @Transactional
    public UserResponse assignRole(Long id, Long roleId, User currentUser) {
        User u = findOrThrow(id);
        Role role = findRole(roleId);
        if (role.getId().equals(u.getRole().getId())) return UserResponse.from(u);
        if (u.getId().equals(currentUser.getId())) {
            throw ApiException.badRequest("Bạn không thể tự đổi vai trò của chính mình.");
        }
        ensureNotLastActiveAdmin(u);
        u.setRole(role);
        tokenStore.revokeAllOf(id); // quyền thay đổi -> buộc đăng nhập lại
        return UserResponse.from(userRepository.save(u));
    }

    // UC-AD05 Deactivate Account (và kích hoạt lại / mở khóa)
    @Transactional
    public UserResponse updateStatus(Long id, String status, User currentUser) {
        User u = findOrThrow(id);
        if (User.INACTIVE.equals(status)) {
            if (u.getId().equals(currentUser.getId())) {
                throw ApiException.badRequest("Bạn không thể vô hiệu hóa tài khoản của chính mình.");
            }
            ensureNotLastActiveAdmin(u);
            tokenStore.revokeAllOf(id);
        } else {
            authService.resetFailures(id);
        }
        u.setStatus(status);
        return UserResponse.from(userRepository.save(u));
    }

    /**
     * Xóa hẳn tài khoản. Chỉ xóa được khi tài khoản CHƯA phát sinh dữ liệu (đơn, thanh toán, phiếu kho...).
     * Nếu đã có dữ liệu thì phải dùng "Vô hiệu hóa" để giữ lịch sử.
     */
    @Transactional
    public void delete(Long id, User currentUser) {
        User u = findOrThrow(id);
        if (u.getId().equals(currentUser.getId())) {
            throw ApiException.badRequest("Bạn không thể xóa tài khoản của chính mình.");
        }
        ensureNotLastActiveAdmin(u);
        try {
            userRepository.delete(u);
            userRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("Tài khoản đã phát sinh dữ liệu (đơn hàng, thanh toán, kho...) nên không thể xóa. "
                    + "Hãy dùng chức năng Vô hiệu hóa.");
        }
        tokenStore.revokeAllOf(id);
    }

    private void ensureNotLastActiveAdmin(User u) {
        if (ADMIN.equals(u.getRole().getName()) && User.ACTIVE.equals(u.getStatus())
                && userRepository.countByRole_NameAndStatus(ADMIN, User.ACTIVE) <= 1) {
            throw ApiException.badRequest("Hệ thống phải còn ít nhất 1 Admin đang hoạt động.");
        }
    }

    private void checkUnique(String username, String email, Long excludeId) {
        String un = username.trim();
        String em = email.trim();
        boolean usernameTaken = excludeId == null
                ? userRepository.existsByUsernameIgnoreCase(un)
                : userRepository.existsByUsernameIgnoreCaseAndIdNot(un, excludeId);
        if (usernameTaken) throw ApiException.conflict("Tên đăng nhập \"" + un + "\" đã tồn tại.");
        boolean emailTaken = excludeId == null
                ? userRepository.existsByEmailIgnoreCase(em)
                : userRepository.existsByEmailIgnoreCaseAndIdNot(em, excludeId);
        if (emailTaken) throw ApiException.conflict("Email \"" + em + "\" đã được sử dụng.");
    }

    private void checkPassword(String password) {
        long min = settings.passwordMinLength();
        if (password.length() < min) throw ApiException.badRequest("Mật khẩu phải có ít nhất " + min + " ký tự.");
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản id = " + id));
    }

    private Role findRole(Long roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò id = " + roleId));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
