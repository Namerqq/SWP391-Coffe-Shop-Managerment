package com.example.project.controller;

import com.example.project.service.FileStorageService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/** Admin tải ảnh lên (ảnh trang chủ...). Chỉ ADMIN gọi được vì nằm dưới /api/admin/**. */
@RestController
@RequestMapping("/api/admin/uploads")
public class UploadController {

    private final FileStorageService storage;

    public UploadController(FileStorageService storage) {
        this.storage = storage;
    }

    /** Trả về { "url": "/uploads/home/abc.jpg" }. Sau đó bấm "Lưu thay đổi" ở Cài đặt hệ thống để áp dụng. */
    @PostMapping
    public Map<String, String> upload(@RequestParam("file") MultipartFile file,
                                      @RequestParam(defaultValue = "home") String folder) {
        return Map.of("url", storage.saveImage(file, folder));
    }
}
