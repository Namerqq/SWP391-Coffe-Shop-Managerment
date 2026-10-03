package com.example.project.service;

import com.example.project.dto.SettingResponse;
import com.example.project.entity.SystemSetting;
import com.example.project.exception.ApiException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.SystemSettingRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** UC-AD06 Configure System Settings + đọc cấu hình cho các phần khác của hệ thống. */
@Service
public class SystemSettingService {

    private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final SystemSettingRepository repository;

    public SystemSettingService(SystemSettingRepository repository) {
        this.repository = repository;
    }

    public List<SettingResponse> getAll() {
        return repository.findAllByOrderByGroupNameAscSortOrderAsc().stream().map(SettingResponse::from).toList();
    }

    /** Lưu nhiều cấu hình một lần; sai 1 giá trị thì không lưu gì cả. */
    @Transactional
    public List<SettingResponse> update(Map<String, String> values, String updatedBy) {
        if (values == null || values.isEmpty()) throw ApiException.badRequest("Không có cấu hình nào để lưu.");
        values.forEach((key, raw) -> {
            SystemSetting s = repository.findById(key)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cấu hình: " + key));
            String value = validate(s, raw == null ? "" : raw.trim());
            if (!value.equals(s.getValue())) {
                s.setValue(value);
                s.setUpdatedBy(updatedBy);
            }
        });
        String open = raw("shop.open_time", "07:00");
        String close = raw("shop.close_time", "22:00");
        if (open.compareTo(close) >= 0) throw ApiException.badRequest("Giờ mở cửa phải trước giờ đóng cửa.");
        repository.flush();
        return getAll();
    }

    private String validate(SystemSetting s, String v) {
        String label = s.getLabel();
        if (v.length() > 500) throw ApiException.badRequest(label + ": tối đa 500 ký tự.");
        switch (s.getDataType()) {
            case "NUMBER" -> {
                BigDecimal n;
                try {
                    n = new BigDecimal(v);
                } catch (NumberFormatException e) {
                    throw ApiException.badRequest(label + ": phải là số.");
                }
                if (n.signum() < 0) throw ApiException.badRequest(label + ": không được âm.");
                if ((s.getKey().startsWith("security.") || s.getKey().endsWith("_minutes")) && n.stripTrailingZeros().scale() > 0) {
                    throw ApiException.badRequest(label + ": phải là số nguyên.");
                }
                if (s.getKey().endsWith("_percent") && n.compareTo(BigDecimal.valueOf(100)) > 0) {
                    throw ApiException.badRequest(label + ": tối đa 100.");
                }
                return n.stripTrailingZeros().toPlainString();
            }
            case "TIME" -> {
                if (!TIME.matcher(v).matches()) throw ApiException.badRequest(label + ": định dạng HH:mm.");
            }
            case "BOOLEAN" -> {
                if (!v.equals("true") && !v.equals("false")) throw ApiException.badRequest(label + ": chỉ nhận true/false.");
            }
            case "EMAIL" -> {
                if (!v.isEmpty() && !EMAIL.matcher(v).matches()) throw ApiException.badRequest(label + ": email không hợp lệ.");
            }
            case "URL", "IMAGE" -> {
                if (!v.isEmpty() && !(v.startsWith("http://") || v.startsWith("https://") || (v.startsWith("/") && !v.startsWith("//")))) {
                    throw ApiException.badRequest(label + ": đường dẫn phải bắt đầu bằng http://, https:// hoặc /.");
                }
            }
            default -> {
                if (s.getKey().equals("shop.name") && v.isEmpty()) throw ApiException.badRequest(label + " không được để trống.");
            }
        }
        return v;
    }

    // ===== Đọc cấu hình (có giá trị mặc định nếu chưa chạy V3__system_settings.sql) =====

    public long sessionTimeoutMinutes() { return Math.max(5, longValue("security.session_timeout_minutes", 120)); }
    public long maxLoginAttempts() { return longValue("security.max_login_attempts", 5); }
    public long passwordMinLength() { return Math.max(1, longValue("security.password_min_length", 6)); }
    public boolean maintenanceMode() { return "true".equals(raw("system.maintenance_mode", "false")); }

    /** Đọc 1 cấu hình bất kỳ (dùng chung: thanh toán, tích điểm, thông tin quán...). */
    public String get(String key, String def) { return raw(key, def); }

    public long getLong(String key, long def) { return longValue(key, def); }

    /** Toàn bộ cấu hình của 1 nhóm dạng key -> value (vd nhóm HOME cho trang chủ khách hàng). */
    public Map<String, String> getGroupValues(String group) {
        Map<String, String> map = new LinkedHashMap<>();
        try {
            repository.findAllByOrderByGroupNameAscSortOrderAsc().stream()
                    .filter(s -> group.equals(s.getGroupName()))
                    .forEach(s -> map.put(s.getKey(), s.getValue()));
        } catch (DataAccessException e) {
            // bảng system_settings chưa tồn tại -> trả về rỗng, frontend dùng nội dung mặc định
        }
        return map;
    }

    private long longValue(String key, long def) {
        try {
            return new BigDecimal(raw(key, String.valueOf(def))).longValue();
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private String raw(String key, String def) {
        try {
            return repository.findById(key).map(SystemSetting::getValue).orElse(def);
        } catch (DataAccessException e) {
            return def; // bảng system_settings chưa tồn tại
        }
    }
}
