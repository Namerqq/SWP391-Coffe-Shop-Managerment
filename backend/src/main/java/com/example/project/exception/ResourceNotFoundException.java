package com.example.project.exception;

/** Ném ra khi không tìm thấy dữ liệu (vd: id không tồn tại). */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
