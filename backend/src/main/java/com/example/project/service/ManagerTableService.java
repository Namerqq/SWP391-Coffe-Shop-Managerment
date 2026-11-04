package com.example.project.service;

import com.example.project.entity.CafeTable;
import com.example.project.entity.SystemSetting;
import com.example.project.entity.TableSession;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CafeTableRepository;
import com.example.project.repository.TableSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.Set;
import java.util.stream.Collectors;
import com.example.project.repository.SystemSettingRepository;
import java.util.List;
import java.util.UUID;

/** Quản lý thông tin bàn, trạng thái phục vụ và mã QR cố định của từng bàn. */
@Service
public class ManagerTableService {

    public static final String DELETED_PREFIX = "table.deleted.";

    private final SystemSettingRepository settings;
    private final GuestSessionStore guests;
    private final CafeTableRepository tableRepository;
    private final TableSessionRepository sessionRepository;

    public ManagerTableService(
            CafeTableRepository tableRepository,
            TableSessionRepository sessionRepository,
            SystemSettingRepository settings,
            GuestSessionStore guests
    ) {
        this.settings = settings;
        this.guests = guests;
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
    }

    /** Dữ liệu trả về cho giao diện quản lý, không trả trực tiếp entity. */
    public record View(
            Long id,
            String tableNumber,
            String qrCode,
            String status,
            Boolean active
    ) {}

    /** Lấy cả bàn đang hoạt động và bàn tạm ngưng để manager có thể mở lại. */
    @Transactional(readOnly = true)
    public List<View> list() {
        Set<String> deletedKeys = settings.findByKeyStartingWith(DELETED_PREFIX).stream()
                .filter(row -> "true".equals(row.getValue()))
                .map(SystemSetting::getKey).collect(Collectors.toSet());
        return tableRepository.findAll().stream()
                .filter(table -> !deletedKeys.contains(DELETED_PREFIX + table.getId()))
                .sorted(Comparator.comparing(CafeTable::getTableNumber))
                .map(this::toView)
                .toList();
    }

    /** id = null: tạo bàn mới; có id: sửa thông tin hoặc ngưng/mở lại bàn. */
    @Transactional
    public View save(Long id, String name, boolean active) {
        // 1. Chuẩn hóa tên và kiểm tra trước khi thay đổi dữ liệu.
        String tableNumber = validateTableNumber(name);
        // Khi thêm lại tên đã xóa: tái sử dụng bản ghi để giữ các tham chiếu lịch sử.
        CafeTable deletedTable = id == null ? tableRepository.findAll().stream()
                .filter(t -> tableNumber.equalsIgnoreCase(t.getTableNumber()))
                .filter(t -> isDeleted(t.getId()))
                .findFirst().orElse(null) : null;
        Long currentId = deletedTable == null ? id : deletedTable.getId();
        validateUniqueTableNumber(currentId, tableNumber);

        // 2. Lấy bàn cần sửa hoặc tạo đối tượng bàn mới.
        CafeTable table;
        if (id == null) {
            table = deletedTable == null ? new CafeTable() : deletedTable;
        } else {
            table = tableRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn."));
        }

        if (id != null && isDeleted(id)) {
            throw new ResourceNotFoundException("Bàn đã xóa. Hãy thêm lại bàn để sử dụng.");
        }
        if (deletedTable != null) {
            validateCanSuspend(table);
            guests.endTable(table.getId());
            settings.deleteById(DELETED_PREFIX + table.getId());
        }

        // 3. Không cho ngưng bàn khi lượt phục vụ vẫn đang diễn ra.
        if (!active && id != null) {
            validateCanSuspend(table);
        }

        // 4. Chỉ sinh mã khi tạo mới; đổi tên hay mở lại đều giữ QR đã in.
        if (id == null) {
            table.setQrCode(UUID.randomUUID().toString());
        }

        table.setTableNumber(tableNumber);
        table.setActive(active);
        updateServingStatus(table, active);

        // 5. Lưu database rồi chuyển kết quả thành DTO trả về frontend.
        CafeTable savedTable = tableRepository.saveAndFlush(table);
        return toView(savedTable);
    }

    private boolean isDeleted(Long id) {
        return settings.findById(DELETED_PREFIX + id)
                .map(row -> "true".equals(row.getValue())).orElse(false);
    }

    /** Xóa mềm: giữ bàn/lịch sử, chặn QR và kết thúc cả token khách chưa gửi đơn. */
    @Transactional
    public void delete(Long id) {
        CafeTable table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn."));
        if (isDeleted(id)) return;
        if (CafeTable.OCCUPIED.equals(table.getStatus()) || sessionRepository
                .findFirstByTable_IdAndStatusIn(id,
                        List.of(TableSession.OPEN, TableSession.PAYMENT_PENDING)).isPresent()) {
            throw ApiException.conflict("Bàn đang có phiên phục vụ, chưa thể xóa.");
        }
        table.setActive(false);
        table.setStatus(CafeTable.UNAVAILABLE);
        tableRepository.saveAndFlush(table);
        settings.save(SystemSetting.deletedTable(DELETED_PREFIX + id));
        guests.endTable(id);
    }

    private String validateTableNumber(String name) {
        String tableNumber = name == null ? "" : name.trim();

        if (tableNumber.isEmpty() || tableNumber.length() > 30) {
            throw ApiException.badRequest("Tên bàn phải có từ 1 đến 30 ký tự.");
        }

        return tableNumber;
    }

    private void validateUniqueTableNumber(Long currentTableId, String tableNumber) {
        // Bỏ qua chính bàn đang sửa, nhưng vẫn kiểm tra cả những bàn tạm ngưng.
        boolean duplicateName = tableRepository.findAll().stream()
                .filter(table -> !table.getId().equals(currentTableId))
                .anyMatch(table -> tableNumber.equalsIgnoreCase(table.getTableNumber()));

        if (duplicateName) {
            throw ApiException.conflict("Tên bàn đã tồn tại, kể cả bàn đang tạm ngưng.");
        }
    }

    private void validateCanSuspend(CafeTable table) {
        if (CafeTable.OCCUPIED.equals(table.getStatus())) {
            throw ApiException.conflict("Bàn đang có phiên phục vụ, chưa thể tạm ngưng.");
        }

        // Kiểm tra thêm phiên trong DB, tránh chỉ phụ thuộc vào nhãn trạng thái bàn.
        boolean hasActiveSession = sessionRepository.findFirstByTable_IdAndStatusIn(
                table.getId(),
                List.of(TableSession.OPEN, TableSession.PAYMENT_PENDING)
        ).isPresent();

        if (hasActiveSession) {
            throw ApiException.conflict("Bàn đang có phiên phục vụ, chưa thể tạm ngưng.");
        }
    }

    private void updateServingStatus(CafeTable table, boolean active) {
        if (!active) {
            table.setStatus(CafeTable.UNAVAILABLE);
        } else if (CafeTable.UNAVAILABLE.equals(table.getStatus())) {
            // Mở lại bàn tạm ngưng; sửa tên bàn có khách không được làm bàn thành trống.
            table.setStatus(CafeTable.AVAILABLE);
        }
    }

    private View toView(CafeTable table) {
        return new View(
                table.getId(),
                table.getTableNumber(),
                table.getQrCode(),
                table.getStatus(),
                table.getActive()
        );
    }
}
