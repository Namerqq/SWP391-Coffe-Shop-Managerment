package com.example.project.service;

import com.example.project.entity.CafeTable;
import com.example.project.entity.TableSession;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CafeTableRepository;
import com.example.project.repository.TableSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class ManagerTableService {
    private final CafeTableRepository tables;
    private final TableSessionRepository sessions;
    public ManagerTableService(CafeTableRepository tables, TableSessionRepository sessions) {
        this.tables = tables; this.sessions = sessions;
    }
    public record View(Long id, String tableNumber, String qrCode, String status, Boolean active) {}
    private View view(CafeTable t) { return new View(t.getId(), t.getTableNumber(), t.getQrCode(), t.getStatus(), t.getActive()); }
    @Transactional(readOnly = true)
    public List<View> list() { return tables.findAll().stream().sorted(java.util.Comparator.comparing(CafeTable::getTableNumber)).map(this::view).toList(); }
    @Transactional
    public View save(Long id, String name, boolean active) {
        String number = name == null ? "" : name.trim();
        if (number.isEmpty() || number.length() > 30) throw ApiException.badRequest("Tên bàn phải có từ 1 đến 30 ký tự.");
        if (tables.findAll().stream().anyMatch(t -> !t.getId().equals(id) && number.equalsIgnoreCase(t.getTableNumber())))
            throw ApiException.conflict("Tên bàn đã tồn tại, kể cả bàn đang tạm ngưng.");
        CafeTable t = id == null ? new CafeTable() : tables.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn."));
        if (!active && id != null && (CafeTable.OCCUPIED.equals(t.getStatus()) || sessions.findFirstByTable_IdAndStatusIn(id, List.of(TableSession.OPEN, TableSession.PAYMENT_PENDING)).isPresent()))
            throw ApiException.conflict("Bàn đang có phiên phục vụ, chưa thể tạm ngưng.");
        if (id == null) t.setQrCode(UUID.randomUUID().toString());
        t.setTableNumber(number);
        t.setActive(active);
        if (!active) t.setStatus(CafeTable.UNAVAILABLE);
        else if (CafeTable.UNAVAILABLE.equals(t.getStatus())) t.setStatus(CafeTable.AVAILABLE);
        return view(tables.saveAndFlush(t));
    }
}
