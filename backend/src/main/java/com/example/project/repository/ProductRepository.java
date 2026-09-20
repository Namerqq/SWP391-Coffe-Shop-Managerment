package com.example.project.repository;

import com.example.project.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** REPOSITORY = nói chuyện với MySQL. JpaRepository đã có sẵn save/findAll/findById/delete... */
public interface ProductRepository extends JpaRepository<Product, Long> {
    // Spring tự sinh câu SQL từ tên hàm
    List<Product> findByNameContainingIgnoreCase(String keyword);
}
