package com.example.project.service;

import com.example.project.dto.MenuItemRequest;
import com.example.project.dto.MenuItemResponse;
import com.example.project.entity.Category;
import com.example.project.entity.MenuItem;
import com.example.project.entity.enums.MenuItemStatus;
import com.example.project.exception.BusinessException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CategoryRepository;
import com.example.project.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * UC-DM01 Manage Drink Menu + UC-DM02 Set Item Availability.
 * Theo quy ước DB của nhóm: không xóa cứng, "xóa" = availability_status INACTIVE.
 */
@Service
public class MenuItemService {

    private final MenuItemRepository repository;
    private final CategoryRepository categoryRepository;

    public MenuItemService(MenuItemRepository repository, CategoryRepository categoryRepository) {
        this.repository = repository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<MenuItemResponse> search(String keyword, Long categoryId, boolean includeInactive) {
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        return repository.search(kw, categoryId, includeInactive, MenuItemStatus.INACTIVE).stream()
                .map(MenuItemResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MenuItemResponse getById(Long id) {
        return MenuItemResponse.from(findOrThrow(id));
    }

    @Transactional
    public MenuItemResponse create(MenuItemRequest req) {
        String name = req.name().trim();
        if (repository.existsByCategoryIdAndNameIgnoreCase(req.categoryId(), name)) {
            throw new BusinessException("Món \"" + name + "\" đã có trong danh mục này");
        }
        MenuItem m = new MenuItem();
        apply(m, req);
        return MenuItemResponse.from(repository.save(m));
    }

    @Transactional
    public MenuItemResponse update(Long id, MenuItemRequest req) {
        MenuItem m = findOrThrow(id);
        if (m.getAvailabilityStatus() == MenuItemStatus.INACTIVE) {
            throw new BusinessException("Món đã ngừng bán, hãy khôi phục trước khi sửa");
        }
        String name = req.name().trim();
        if (repository.existsByCategoryIdAndNameIgnoreCaseAndIdNot(req.categoryId(), name, id)) {
            throw new BusinessException("Món \"" + name + "\" đã có trong danh mục này");
        }
        apply(m, req);
        return MenuItemResponse.from(repository.save(m));
    }

    /** UC-DM02: bật/tắt "Còn bán". Chỉ nhận AVAILABLE / UNAVAILABLE. */
    @Transactional
    public MenuItemResponse changeAvailability(Long id, MenuItemStatus status) {
        if (status == MenuItemStatus.INACTIVE) {
            throw new BusinessException("Dùng chức năng Xóa để ngừng bán món");
        }
        MenuItem m = findOrThrow(id);
        if (m.getAvailabilityStatus() == MenuItemStatus.INACTIVE) {
            throw new BusinessException("Món đã ngừng bán, hãy khôi phục trước");
        }
        m.setAvailabilityStatus(status);
        return MenuItemResponse.from(repository.save(m));
    }

    /** "Xóa" = chuyển INACTIVE: món biến mất khỏi menu nhưng lịch sử đơn hàng vẫn giữ nguyên. */
    @Transactional
    public void delete(Long id) {
        MenuItem m = findOrThrow(id);
        m.setAvailabilityStatus(MenuItemStatus.INACTIVE);
        repository.save(m);
    }

    /** Khôi phục món đã xóa về trạng thái còn bán. */
    @Transactional
    public MenuItemResponse restore(Long id) {
        MenuItem m = findOrThrow(id);
        m.setAvailabilityStatus(MenuItemStatus.AVAILABLE);
        return MenuItemResponse.from(repository.save(m));
    }

    private MenuItem findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món id = " + id));
    }

    private void apply(MenuItem m, MenuItemRequest req) {
        Category category = categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục id = " + req.categoryId()));
        m.setCategory(category);
        m.setName(req.name().trim());
        m.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        m.setBasePrice(req.basePrice());
        m.setImageUrl(req.imageUrl() == null || req.imageUrl().isBlank() ? null : req.imageUrl().trim());
        if (req.availabilityStatus() == MenuItemStatus.AVAILABLE || req.availabilityStatus() == MenuItemStatus.UNAVAILABLE) {
            m.setAvailabilityStatus(req.availabilityStatus());
        }
    }
}
