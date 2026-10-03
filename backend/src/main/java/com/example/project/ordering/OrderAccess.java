package com.example.project.ordering;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import static com.example.project.ordering.OrderDtos.*;

/** Session adapter for the shared users/roles tables; replace with the team's principal when auth is integrated. */
@Component
public class OrderAccess {
    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final String dummyHash = encoder.encode(UUID.randomUUID().toString());
    public OrderAccess(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Staff login(Login input, HttpSession session) {
        long now = System.currentTimeMillis();
        synchronized (session) {
            Long start = (Long) session.getAttribute("loginWindow");
            if (start == null || now - start > 60000) { session.setAttribute("loginWindow", now); session.setAttribute("loginAttempts", 0); }
            int attempts = (Integer) session.getAttribute("loginAttempts");
            if (attempts >= 10) throw new OrderProblem(429, "Bạn đã thử quá nhiều lần. Vui lòng đợi một phút.");
            session.setAttribute("loginAttempts", attempts + 1);
        }
        var users = jdbc.queryForList("SELECT u.user_id,u.full_name,u.username,u.password_hash,u.status,r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.username=?", input.username());
        String hash = users.isEmpty() ? dummyHash : (String) users.get(0).get("password_hash");
        if (!encoder.matches(input.password(), hash) || users.isEmpty()) throw new OrderProblem(401, "Tên đăng nhập hoặc mật khẩu không đúng.");
        var user = users.get(0);
        if (!"ACTIVE".equals(user.get("status")) || !Set.of("WAITER", "MANAGER").contains(user.get("role_name")))
            throw new OrderProblem(403, "Tài khoản không có quyền phục vụ hoặc đã bị khóa.");
        session.setAttribute("staffId", ((Number) user.get("user_id")).longValue());
        session.removeAttribute("loginAttempts"); session.removeAttribute("loginWindow");
        return requireStaff(session);
    }
    public Staff requireStaff(HttpSession session) {
        Object id = session.getAttribute("staffId");
        if (id == null) throw new OrderProblem(401, "Vui lòng đăng nhập tài khoản phục vụ.");
        var rows = jdbc.query("SELECT u.user_id,u.full_name,u.username,r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=? AND u.status='ACTIVE' AND r.role_name IN ('WAITER','MANAGER')",
            (rs,n) -> new Staff(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4)), id);
        if (rows.isEmpty()) { session.removeAttribute("staffId"); throw new OrderProblem(403, "Tài khoản không còn quyền phục vụ."); }
        return rows.get(0);
    }
    public Long tableId(HttpSession session) { return (Long) session.getAttribute("qrTableId"); }
    public void setTable(HttpSession session, long id) { session.setAttribute("qrTableId", id); }
    @SuppressWarnings("unchecked")
    public Set<Long> owned(HttpSession session) {
        synchronized(session) {
            Set<Long> ids = (Set<Long>) session.getAttribute("ownedOrders");
            if (ids == null) { ids = ConcurrentHashMap.newKeySet(); session.setAttribute("ownedOrders", ids); }
            return ids;
        }
    }
    public String nonce(HttpSession session) {
        synchronized(session) {
            String nonce = (String) session.getAttribute("orderNonce");
            if (nonce == null) { nonce = UUID.randomUUID().toString(); session.setAttribute("orderNonce", nonce); }
            return nonce;
        }
    }
}
