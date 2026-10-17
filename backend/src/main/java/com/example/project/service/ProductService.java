package com.example.project.service;

import com.example.project.dto.ProductRequest;
import com.example.project.dto.ProductResponse;
import com.example.project.entity.Product;
import com.example.project.exception.ResourceNotFoundException;
import com.example.project.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** SERVICE = nơi viết LOGIC nghiệp vụ. Controller gọi Service, Service gọi Repository. */
@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public List<ProductResponse> getAll(String keyword) {
        List<Product> list = (keyword == null || keyword.isBlank())
                ? repository.findAll()
                : repository.findByNameContainingIgnoreCase(keyword);
        return list.stream().map(ProductResponse::from).toList();
    }

    public ProductResponse getById(Long id) {
        return ProductResponse.from(findOrThrow(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest req) {
        Product p = new Product();
        apply(p, req);
        return ProductResponse.from(repository.save(p));
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest req) {
        Product p = findOrThrow(id);
        apply(p, req);
        return ProductResponse.from(repository.save(p));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(findOrThrow(id));
    }

    private Product findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm id = " + id));
    }

    private void apply(Product p, ProductRequest req) {
        p.setName(req.name());
        p.setPrice(req.price());
        p.setQuantity(req.quantity());
        p.setDescription(req.description());
    }
}
