package com.example.project.service;

import com.example.project.dto.menu.ItemCustomization;
import com.example.project.entity.MenuItem;
import com.example.project.entity.SystemSetting;
import com.example.project.exception.ApiException;
import com.example.project.repository.SystemSettingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class ItemCustomizationService {
    public static final String PREFIX = "menu.customization.";
    public static final List<String> SIZES = List.of("S", "M", "L");
    public static final List<String> LEVELS = List.of("100%", "70%", "50%", "30%", "0%");
    private final SystemSettingRepository settings;
    private final ObjectMapper json;
    public ItemCustomizationService(SystemSettingRepository settings, ObjectMapper json) {
        this.settings = settings; this.json = json;
    }
    public static ItemCustomization defaults(MenuItem item) {
        if (item.getCategory().isType("TOPPING") || item.getCategory().isType("SIZE")) {
            return new ItemCustomization(List.of(), null, List.of(), null, List.of(), null, false);
        }
        return new ItemCustomization(List.of("M", "L"), "M", LEVELS, "100%", LEVELS, "100%", true);
    }
    @Transactional(readOnly = true)
    public ItemCustomization get(MenuItem item) {
        if (item.getCategory().isOptionGroup()) return defaults(item);
        return settings.findById(PREFIX + item.getId()).map(row -> {
            try { return json.readValue(row.getValue(), ItemCustomization.class); }
            catch (Exception ex) { throw ApiException.badRequest("Cấu hình lựa chọn món không hợp lệ, vui lòng báo quản lý."); }
        }).orElseGet(() -> defaults(item));
    }
    private List<String> check(List<String> values, String selected, List<String> allowed, String label) {
        if (values == null || values.stream().anyMatch(v -> v == null || !allowed.contains(v))) {
            throw ApiException.badRequest("Lựa chọn " + label + " không hợp lệ.");
        }
        List<String> normalized = allowed.stream().filter(values::contains).toList();
        if (normalized.isEmpty() ? selected != null : !normalized.contains(selected)) {
            throw ApiException.badRequest("Giá trị mặc định " + label + " phải nằm trong danh sách cho phép.");
        }
        return normalized;
    }
    @Transactional
    public void save(MenuItem item, ItemCustomization config) {
        if (config == null) return; // Old clients and unchanged legacy items retain their current policy.
        if (item.getCategory().isOptionGroup()) throw ApiException.badRequest("Size/đường/đá chỉ cấu hình cho món chính.");
        ItemCustomization normalized = new ItemCustomization(
                check(config.sizes(), config.defaultSize(), SIZES, "size"), config.defaultSize(),
                check(config.sugarLevels(), config.defaultSugar(), LEVELS, "đường"), config.defaultSugar(),
                check(config.iceLevels(), config.defaultIce(), LEVELS, "đá"), config.defaultIce(), false);
        try {
            String value = json.writeValueAsString(normalized);
            if (value.length() > 500) throw ApiException.badRequest("Cấu hình món vượt quá giới hạn.");
            SystemSetting row = settings.findById(PREFIX + item.getId())
                    .orElseGet(() -> SystemSetting.itemCustomization(PREFIX + item.getId()));
            row.setValue(value); settings.save(row);
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw ApiException.badRequest("Không lưu được cấu hình món.");
        }
    }
    @Transactional public void remove(Long id) { settings.findById(PREFIX + id).ifPresent(settings::delete); }
    public static String select(String requested, List<String> allowed, String fallback, String label) {
        String value = OrderSupportService.blankToNull(requested);
        if (value == null) return fallback;
        if (!allowed.contains(value)) throw ApiException.badRequest("Món không hỗ trợ lựa chọn " + label + " này.");
        return value;
    }
    public static long price(String size, boolean legacy) {
        if (size == null) return 0;
        if (legacy) return "L".equals(size) ? 10000L : 0L;
        return switch (size) { case "S" -> 0L; case "M" -> 5000L; case "L" -> 15000L;
            default -> throw ApiException.badRequest("Size không hợp lệ."); };
    }
}
