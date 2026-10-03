package com.example.project.service;

import com.example.project.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/** Lưu ảnh upload vào thư mục app.upload-dir (mặc định backend/uploads, KHÔNG commit lên git). */
@Service
public class FileStorageService {

    private static final Set<String> EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir:uploads}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public String saveImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Vui lòng chọn ảnh.");
        String sub = folder == null ? "" : folder.toLowerCase().replaceAll("[^a-z0-9-]", "");
        if (sub.isBlank()) sub = "home";

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase() : "";
        String contentType = file.getContentType();
        if (!EXTENSIONS.contains(ext) || contentType == null || !contentType.startsWith("image/")) {
            throw ApiException.badRequest("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.");
        }
        try (InputStream in = file.getInputStream()) {
            Path dir = root.resolve(sub);
            Files.createDirectories(dir);
            String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
            Files.copy(in, dir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + sub + "/" + name;
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được ảnh, vui lòng thử lại.");
        }
    }
}
