package com.example.project.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Gắn lên Controller (cả class) hoặc từng hàm để chỉ cho phép các vai trò này gọi API.
 * Ví dụ: @RequireRole({"WAITER", "CASHIER"}). Không gắn = chỉ cần đăng nhập.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireRole {
    String[] value();
}
