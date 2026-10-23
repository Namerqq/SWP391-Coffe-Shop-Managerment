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
 */
@Service
public class IncidentReportService {

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
                r.getAction(), r.getReason(), staffName(r.getReportedBy()), r.getCreatedAt(),
                r.getStatus(), r.getPenaltyAmount(), r.getManagerNote(), staffName(r.getReviewedBy()), r.getReviewedAt());
    }

    private static String staffName(User u) {
        if (u == null) return null;
        if (u.getFullName() != null && !u.getFullName().isBlank()) return u.getFullName();
        return u.getUsername();
    }
}
