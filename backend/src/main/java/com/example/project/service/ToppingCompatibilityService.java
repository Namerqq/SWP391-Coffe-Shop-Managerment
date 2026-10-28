package com.example.project.service;

import com.example.project.entity.MenuItem;
import com.example.project.entity.SystemSetting;
import com.example.project.exception.ApiException;
import com.example.project.repository.MenuItemRepository;
import com.example.project.repository.SystemSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.regex.Pattern;

/** Stores menu compatibility in existing settings, without changing the schema. */
@Service
@Transactional
public class ToppingCompatibilityService {
    public static final String PREFIX = "menu.topping.";
    private static final Pattern KEY = Pattern.compile("menu\\.topping\\.(\\d+)\\.item\\.(\\d+)");
    private final SystemSettingRepository settings;
    private final MenuItemRepository items;
    public ToppingCompatibilityService(SystemSettingRepository settings, MenuItemRepository items) {
        this.settings = settings;
        this.items = items;
    }
    private static String prefix(Long toppingId) { return PREFIX + toppingId + ".item."; }
    @Transactional(readOnly = true)
    public Map<Long, List<Long>> rules() {
        Map<Long, List<Long>> result = new HashMap<>();
        for (SystemSetting row : settings.findByKeyStartingWith(PREFIX)) {
            var match = KEY.matcher(row.getKey());
            if (match.matches() && "true".equals(row.getValue())) {
                try {
                    result.computeIfAbsent(Long.valueOf(match.group(1)), ignored -> new ArrayList<>())
                            .add(Long.valueOf(match.group(2)));
                } catch (NumberFormatException ignored) { /* Ignore malformed legacy settings. */ }
            }
        }
        result.values().forEach(Collections::sort);
        return result;
    }
    @Transactional(readOnly = true)
    public List<Long> allowedItemIds(Long toppingId) {
        return rules().getOrDefault(toppingId, List.of());
    }
    @Transactional(readOnly = true)
    public boolean allows(Long toppingId, Long itemId) {
        return settings.findById(prefix(toppingId) + itemId)
                .map(row -> "true".equals(row.getValue())).orElse(false);
    }
    public void replace(Long toppingId, List<Long> requested) {
        Set<Long> ids = new LinkedHashSet<>(requested == null ? List.of() : requested);
        for (Long id : ids) {
            if (id == null) throw ApiException.badRequest("Món đi kèm không hợp lệ.");
            MenuItem item = items.findById(id)
                    .orElseThrow(() -> ApiException.badRequest("Món đi kèm không tồn tại."));
            if (MenuItem.INACTIVE.equals(item.getAvailabilityStatus())
                    || !"ACTIVE".equals(item.getCategory().getStatus())
                    || !(item.getCategory().isType("DRINK") || item.getCategory().isType("FOOD"))) {
                throw ApiException.badRequest("Chỉ gán topping cho đồ uống hoặc đồ ăn chưa xoá.");
            }
        }
        List<SystemSetting> old = settings.findByKeyStartingWith(prefix(toppingId));
        Set<String> wanted = new HashSet<>();
        for (Long id : ids) wanted.add(prefix(toppingId) + id);
        settings.deleteAll(old.stream().filter(row -> !wanted.contains(row.getKey())).toList());
        Map<String, SystemSetting> existing = new HashMap<>();
        old.forEach(row -> existing.put(row.getKey(), row));
        for (String key : wanted) {
            SystemSetting row = existing.getOrDefault(key, SystemSetting.menuRule(key));
            row.setValue("true");
            settings.save(row);
        }
    }
    /** Remove both incoming and outgoing links when deleting/changing the type of an item. */
    public void removeForItem(Long id) {
        settings.deleteAll(settings.findByKeyStartingWith(PREFIX).stream().filter(row -> {
            var match = KEY.matcher(row.getKey());
            return match.matches() && (match.group(1).equals(id.toString()) || match.group(2).equals(id.toString()));
        }).toList());
    }
}
