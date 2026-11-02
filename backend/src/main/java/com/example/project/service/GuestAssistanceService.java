package com.example.project.service;

import com.example.project.dto.assistance.AssistanceView;
import com.example.project.entity.CafeTable;
import com.example.project.entity.User;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CafeTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/** One latest call per table, in memory. Restarting the backend clears all calls. */
@Service
public class GuestAssistanceService {
    private final GuestSessionStore guests;
    private final CafeTableRepository tables;
    private final Clock clock;
    private final Map<Long, AssistanceView> calls = new HashMap<>();

    @Autowired
    public GuestAssistanceService(GuestSessionStore guests, CafeTableRepository tables) {
        this(guests, tables, Clock.systemUTC());
    }
    GuestAssistanceService(GuestSessionStore guests, CafeTableRepository tables, Clock clock) {
        this.guests = guests; this.tables = tables; this.clock = clock;
    }
    private boolean active(AssistanceView call) { return !"COMPLETED".equals(call.status()); }

    public synchronized AssistanceView current(String token) {
        return calls.get(guests.require(token).tableId());
    }
    public synchronized AssistanceView create(String token, String note) {
        long tableId = guests.require(token).tableId();
        CafeTable table = tables.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn."));
        if (!Boolean.TRUE.equals(table.getActive()) || CafeTable.UNAVAILABLE.equals(table.getStatus())) {
            throw ApiException.badRequest("Bàn đang tạm ngưng phục vụ.");
        }
        AssistanceView old = calls.get(tableId);
        if (old != null && active(old)) return old;
        Instant now = clock.instant();
        if (old != null && Duration.between(old.updatedAt(), now).getSeconds() < 30) {
            throw ApiException.conflict("Vui lòng chờ 30 giây sau khi hoàn tất trước khi gọi lại.");
        }
        String text = OrderSupportService.blankToNull(note);
        if (text != null && text.length() > 300) throw ApiException.badRequest("Ghi chú tối đa 300 ký tự.");
        AssistanceView call = new AssistanceView(UUID.randomUUID().toString(), tableId,
                table.getTableNumber(), text, "PENDING", now, now, null, null);
        calls.put(tableId, call);
        return call;
    }
    public synchronized List<AssistanceView> pending() {
        return calls.values().stream().filter(this::active)
                .sorted(Comparator.comparing(AssistanceView::createdAt)).toList();
    }
    private AssistanceView find(String id) {
        return calls.values().stream().filter(c -> c.id().equals(id)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Yêu cầu không còn tồn tại. Vui lòng tải lại."));
    }
    public synchronized AssistanceView accept(String id, User waiter) {
        AssistanceView old = find(id);
        if (!"PENDING".equals(old.status())) {
            if ("ACCEPTED".equals(old.status()) && Objects.equals(old.acceptedById(), waiter.getId())) return old;
            throw ApiException.conflict("Yêu cầu đã được nhân viên khác tiếp nhận hoặc đã hoàn tất.");
        }
        AssistanceView next = new AssistanceView(old.id(), old.tableId(), old.tableNumber(), old.note(),
                "ACCEPTED", old.createdAt(), clock.instant(), waiter.getId(), waiter.getFullName());
        calls.put(next.tableId(), next);
        return next;
    }
    public synchronized AssistanceView complete(String id, User waiter) {
        AssistanceView old = find(id);
        if (!Objects.equals(old.acceptedById(), waiter.getId())) {
            throw ApiException.conflict("Chỉ nhân viên đã tiếp nhận mới được hoàn tất yêu cầu.");
        }
        if ("COMPLETED".equals(old.status())) return old;
        if (!"ACCEPTED".equals(old.status())) throw ApiException.conflict("Hãy tiếp nhận yêu cầu trước.");
        AssistanceView next = new AssistanceView(old.id(), old.tableId(), old.tableNumber(), old.note(),
                "COMPLETED", old.createdAt(), clock.instant(), old.acceptedById(), old.acceptedByName());
        calls.put(next.tableId(), next);
        return next;
    }
}
