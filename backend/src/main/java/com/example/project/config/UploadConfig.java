package com.example.project.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/** Phục vụ ảnh đã upload (ảnh trang chủ...) tại http://localhost:8080/uploads/... */
@Configuration
public class UploadConfig implements WebMvcConfigurer {

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(uploadDir).toAbsolutePath().normalize().toUri().toString();
        if (!location.endsWith("/")) location = location + "/";
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
