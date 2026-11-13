package com.example.project.service;

import com.example.project.dto.incident.IncidentReportView;
import com.example.project.dto.incident.IncidentReviewRequest;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.MenuItem;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.Role;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.repository.IncidentReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Lỗi 3 (13/11/2026): biên bản do thu ngân / job cuối ngày tạo bị coi là lỗi "làm đổ / vỡ" của người báo.
 * Sửa: biên bản có source (WAITER / CASHIER / SYSTEM); chỉ biên bản WAITER mới phạt được.
 * Chạy riêng: mvn test -Dtest=IncidentReportSourceTest
 */
class IncidentReportSourceTest {

    private IncidentReportRepository repository;
    private IncidentReportService service;
    private final User manager = user(99, "Quản lý", "MANAGER");

    @BeforeEach
    void setUp() {
        repository = mock(IncidentReportRepository.class);
        service = new IncidentReportService(repository);
        when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private static User user(long id, String name, String role) {
        Role r = new Role();
        r.setName(role);
        User u = new User();
        ReflectionTestUtils.setField(u, "id", id);
        u.setFullName(name);
        u.setUsername(name);
        u.setRole(r);
        return u;
    }

    private static IncidentReport report(long id, User reporter, String action) {
        MenuItem m = new MenuItem();
        m.setName("Latte");
        Order o = new Order();
        ReflectionTestUtils.setField(o, "id", 10L);
        o.setOrderNumber("OD261113-0007");
        OrderItem line = new OrderItem();
        ReflectionTestUtils.setField(line, "id", 1L);
        line.setMenuItem(m);
        line.setQuantity(1);
        line.setSubtotal(45000L);
        line.setOrder(o);
        IncidentReport r = new IncidentReport();
        ReflectionTestUtils.setField(r, "id", id);
        r.setOrderItem(line);
        r.setReportedBy(reporter);
        r.setAction(action);
        r.setReason("test");
        return r;
    }

    @Test
    @DisplayName("Danh sách: mỗi biên bản có nguồn đúng theo vai trò người báo")
    void listShowsSourceByReporterRole() {
        IncidentReport byWaiter = report(3, user(1, "Phục vụ A", "WAITER"), IncidentReport.REMAKE);
        IncidentReport byCashier = report(2, user(2, "Thu ngân B", "CASHIER"), IncidentReport.CANCEL);
        IncidentReport byJob = report(1, user(3, "Admin", "ADMIN"), IncidentReport.CANCEL);
        when(repository.findAllByOrderByIdDesc()).thenReturn(List.of(byWaiter, byCashier, byJob));

        List<IncidentReportView> views = service.list(null);

        assertEquals(List.of("WAITER", "CASHIER", "SYSTEM"), views.stream().map(IncidentReportView::source).toList());
        assertEquals("Phục vụ A", views.get(0).reporterName());
    }

    @Test
    @DisplayName("Biên bản phục vụ báo đổ / vỡ: quản lý phạt được")
    void waiterReportCanBePenalised() {
        IncidentReport r = report(3, user(1, "Phục vụ A", "WAITER"), IncidentReport.REMAKE);
        when(repository.findById(3L)).thenReturn(Optional.of(r));

        IncidentReportView v = service.review(3L, new IncidentReviewRequest(20000L, "Nhắc nhở lần 1"), manager);

        assertEquals(IncidentReport.REVIEWED, v.status());
        assertEquals(20000L, v.penaltyAmount());
        assertEquals("WAITER", v.source());
    }

    @Test
    @DisplayName("Biên bản thu ngân bỏ / hoàn món: không phạt được người báo (mức phạt > 0 bị chặn)")
    void cashierReportCannotBePenalised() {
        IncidentReport r = report(2, user(2, "Thu ngân B", "CASHIER"), IncidentReport.CANCEL);
        when(repository.findById(2L)).thenReturn(Optional.of(r));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.review(2L, new IncidentReviewRequest(20000L, null), manager));

        assertTrue(ex.getMessage().contains("không phạt"), ex.getMessage());
        assertEquals(IncidentReport.PENDING, r.getStatus());
        assertNull(r.getPenaltyAmount());
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Biên bản tự động cuối ngày (Admin): không phạt được; nhập 0 thì ghi nhận hao hụt")
    void systemReportOnlyAcknowledged() {
        IncidentReport r = report(1, user(3, "Admin", "ADMIN"), IncidentReport.CANCEL);
        when(repository.findById(1L)).thenReturn(Optional.of(r));

        assertThrows(ApiException.class, () -> service.review(1L, new IncidentReviewRequest(5000L, null), manager));
        IncidentReportView v = service.review(1L, new IncidentReviewRequest(0L, "Đã kiểm tra"), manager);

        assertEquals(IncidentReport.REVIEWED, v.status());
        assertEquals(0L, v.penaltyAmount());
        assertEquals("SYSTEM", v.source());
        assertEquals("Quản lý", v.reviewerName());
    }
}
