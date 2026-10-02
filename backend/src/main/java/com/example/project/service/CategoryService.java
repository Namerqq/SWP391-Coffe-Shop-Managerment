package com.example.project.service;

import com.example.project.dto.CategoryRequest;
import com.example.project.dto.CategoryResponse;
import com.example.project.entity.Category;
import com.example.project.entity.enums.CategoryStatus;
import com.example.project.entity.enums.MenuItemStatus;
import com.example.project.exception.BusinessException;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.CategoryRepository;
import com.example.project.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** UC-CG01 Manage Category: thêm / sửa / ẩn-hiện / xóa danh mục. */
@Service
public class CategoryService {

    private final CategoryRepository repository;
    private final MenuItemRepository menuItemRepository;

    public CategoryService(CategoryRepository repository, MenuItemRepository menuItemRepository) {
        this.repository = repository;
        this.menuItemRepository = menuItemRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : menuItemRepository.countGroupByCategory(MenuItemStatus.INACTIVE)) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return repository.findAllByOrderByIdAsc().stream()
                .map(c -> CategoryResponse.from(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest req) {
        String name = req.name().trim();
        if (repository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("Danh mục \"" + name + "\" đã tồn tại");
        }
        Category c = new Category();
        apply(c, req);
        return toResponse(repository.save(c));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest req) {
        Category c = findOrThrow(id);
        String name = req.name().trim();
        if (repository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BusinessException("Danh mục \"" + name + "\" đã tồn tại");
        }
        apply(c, req);
        return toResponse(repository.save(c));
    }

    /** Ẩn / hiện danh mục. Danh mục ẩn sẽ không hiện trên menu của khách. */
    @Transactional
    public CategoryResponse changeStatus(Long id, CategoryStatus status) {
        Category c = findOrThrow(id);
        c.setStatus(status);
        return toResponse(repository.save(c));
    }

    /** Chỉ xóa được danh mục chưa có món nào (kể cả món INACTIVE, vì đơn cũ còn tham chiếu qua món). */
    @Transactional
    public void delete(Long id) {
        Category c = findOrThrow(id);
        long count = menuItemRepository.countByCategoryId(id);
        if (count > 0) {
            throw new BusinessException("Danh mục \"" + c.getName() + "\" đang có " + count
                    + " món nên không thể xóa. Hãy chuyển trạng thái sang Ẩn.");
        }
        repository.delete(c);
    }

    private Category findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục id = " + id));
    }

    private CategoryResponse toResponse(Category c) {
        return CategoryResponse.from(c,
                menuItemRepository.countByCategoryIdAndAvailabilityStatusNot(c.getId(), MenuItemStatus.INACTIVE));
    }

    private void apply(Category c, CategoryRequest req) {
        c.setName(req.name().trim());
        c.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        if (req.status() != null) c.setStatus(req.status());
    }
}
