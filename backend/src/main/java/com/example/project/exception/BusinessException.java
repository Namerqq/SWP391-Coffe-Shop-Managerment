package com.example.project.exception;

/** Ném ra khi vi phạm quy tắc nghiệp vụ (vd: trùng tên danh mục, món đã hết...). Trả về 400. */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
