package com.example.project.service;

import com.example.project.dto.incident.IncidentReportView;
import com.example.project.dto.incident.IncidentReviewRequest;
import com.example.project.entity.IncidentReport;
import com.example.project.entity.Order;
import com.example.project.entity.OrderItem;
import com.example.project.entity.TableSession;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.IncidentReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Biên bản sự cố làm đổ / vỡ món.
 * Phục vụ báo sự cố -> tạo biên bản (PENDING). Quản lý xem và quyết định mức phạt -> REVIEWED.
 * Thu ngân bỏ / hoàn món đã pha và job cuối ngày cũng tạo biên bản (ghi nhận hao hụt): loại này không phạt người báo.
 */
@Service
public class IncidentReportService {

    static final String SOURCE_WAITER = "WAITER";
    static final String SOURCE_CASHIER = "CASHIER";
    static final String SOURCE_SYSTEM = "SYSTEM";

    private final IncidentReportRepository repository;

    public IncidentReportService(IncidentReportRepository repository) {
        this.repository = repository;
    }

    /** Tạo biên bản khi phục vụ báo sự cố (gọi từ ServingService.reportIncident). */
    public void create(OrderItem line, User waiter, String action, String reason) {
        IncidentReport report = new IncidentReport();
        report.setOrderItem(line);
        report.setReportedBy(waiter);
        report.setAction(action);
        report.setReason(reason);
        repository.save(report);
    }

    /** Danh sách biên bản cho quản lý. status = PENDING / REVIEWED, để trống = tất cả. */
    @Transactional(readOnly = true)
    public List<IncidentReportView> list(String status) {
        List<IncidentReport> reports;
        if (status == null || status.isBlank()) {
            reports = repository.findAllByOrderByIdDesc();
        } else {
            reports = repository.findByStatusOrderByIdDesc(status.trim().toUpperCase());
        }
        List<IncidentReportView> result = new ArrayList<>();
        for (IncidentReport r : reports) {
            result.add(toView(r));
        }
        return result;
    }

    /** Quản lý nhập mức phạt (0 = không phạt) và ghi chú. Biên bản đã xử lý vẫn sửa lại được. */
    @Transactional
    public IncidentReportView review(Long id, IncidentReviewRequest req, User manager) {
        IncidentReport report = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biên bản sự cố id = " + id));
        if (req.penaltyAmount() == null || req.penaltyAmount() < 0) {
            throw ApiException.badRequest("Mức phạt không hợp lệ.");
        }
        // Biên bản do thu ngân / job cuối ngày tạo chỉ ghi nhận hao hụt món, người báo không có lỗi nên không phạt.
        if (!SOURCE_WAITER.equals(sourceOf(report)) && req.penaltyAmount() > 0) {
            throw ApiException.badRequest("Biên bản này do thu ngân / hệ thống tạo để ghi nhận hao hụt món, "
                    + "người báo không có lỗi nên không phạt được. Vui lòng nhập 0.");
        }
        String note = req.managerNote() == null ? null : req.managerNote().trim();
        if (note != null && note.isEmpty()) note = null;

        report.setPenaltyAmount(req.penaltyAmount());
        report.setManagerNote(note);
        report.setReviewedBy(manager);
        report.setReviewedAt(LocalDateTime.now());
        report.setStatus(IncidentReport.REVIEWED);
        return toView(repository.saveAndFlush(report));
    }

    private IncidentReportView toView(IncidentReport r) {
        OrderItem line = r.getOrderItem();
        Order o = line.getOrder();
        TableSession s = o.getTableSession();
        String tableNumber = s == null ? null : s.getTable().getTableNumber();
        long itemValue = line.getSubtotal() == null ? 0 : line.getSubtotal();
        return new IncidentReportView(r.getId(), o.getId(), OrderSupportService.displayNumber(o.getOrderNumber()),
                tableNumber, line.getMenuItem().getName(), line.getQuantity(), itemValue,
                r.getAction(), r.getReason(), staffName(r.getReportedBy()), sourceOf(r), r.getCreatedAt(),
                r.getStatus(), r.getPenaltyAmount(), r.getManagerNote(), staffName(r.getReviewedBy()), r.getReviewedAt());
    }

    /**
     * Nguồn biên bản theo vai trò người báo: phục vụ báo đổ / vỡ (WAITER), thu ngân bỏ / hoàn món (CASHIER),
     * còn lại là job cuối ngày ghi bằng tài khoản Admin (SYSTEM).
     */
    static String sourceOf(IncidentReport r) {
        User u = r.getReportedBy();
        String role = u == null || u.getRole() == null ? null : u.getRole().getName();
        if (SOURCE_WAITER.equals(role)) return SOURCE_WAITER;
        if (SOURCE_CASHIER.equals(role)) return SOURCE_CASHIER;
        return SOURCE_SYSTEM;
    }

    private static String staffName(User u) {
        if (u == null) return null;
        if (u.getFullName() != null && !u.getFullName().isBlank()) return u.getFullName();
        return u.getUsername();
    }
}
