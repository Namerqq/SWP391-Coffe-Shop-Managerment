package com.example.project.repository;

import com.example.project.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    // DB không có cột display_order -> sắp theo category_id (thứ tự tạo)
    List<Category> findAllByOrderByIdAsc();

    // Kiểm tra trùng tên (uq_categories_name)
    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
