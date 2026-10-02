package com.example.project.repository;

import com.example.project.entity.MenuItem;
import com.example.project.entity.enums.CategoryStatus;
import com.example.project.entity.enums.MenuItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    /** Màn quản lý: lọc theo từ khóa, danh mục; includeInactive = hiện cả món đã ngừng bán (INACTIVE). */
    @Query("""
            SELECT m FROM MenuItem m JOIN FETCH m.category c
            WHERE (:keyword IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:categoryId IS NULL OR c.id = :categoryId)
              AND (:includeInactive = TRUE OR m.availabilityStatus <> :inactive)
            ORDER BY c.id, m.name
            """)
    List<MenuItem> search(@Param("keyword") String keyword,
                          @Param("categoryId") Long categoryId,
                          @Param("includeInactive") boolean includeInactive,
                          @Param("inactive") MenuItemStatus inactive);

    /** Menu của khách: danh mục ACTIVE, bỏ món INACTIVE (món UNAVAILABLE vẫn hiện, nhưng không chọn được). */
    @Query("""
            SELECT m FROM MenuItem m JOIN FETCH m.category c
            WHERE c.status = :categoryStatus AND m.availabilityStatus <> :inactive
            ORDER BY c.id, m.name
            """)
    List<MenuItem> findForCustomerMenu(@Param("categoryStatus") CategoryStatus categoryStatus,
                                       @Param("inactive") MenuItemStatus inactive);

    /** Đếm số món đang dùng (khác INACTIVE) theo danh mục -> [categoryId, count]. */
    @Query("""
            SELECT m.category.id, COUNT(m) FROM MenuItem m
            WHERE m.availabilityStatus <> :inactive
            GROUP BY m.category.id
            """)
    List<Object[]> countGroupByCategory(@Param("inactive") MenuItemStatus inactive);

    long countByCategoryIdAndAvailabilityStatusNot(Long categoryId, MenuItemStatus status);

    long countByCategoryId(Long categoryId);

    // Ràng buộc uq_menu_items_category_name: tên món không trùng trong cùng 1 danh mục
    boolean existsByCategoryIdAndNameIgnoreCase(Long categoryId, String name);

    boolean existsByCategoryIdAndNameIgnoreCaseAndIdNot(Long categoryId, String name, Long id);
}
