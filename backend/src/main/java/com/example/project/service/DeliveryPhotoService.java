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
import java.util.List;
import java.util.Locale;

/**
 * Ảnh xác nhận giao hàng: phục vụ chụp món lúc giao xong.
 * Không thêm cột DB: ảnh lưu thành file uploads/deliveries/delivery-{deliveryId}.{đuôi},
 * tìm lại theo đúng tên đó. Mỗi đơn giao chỉ có 1 ảnh.
 */
@Service
public class DeliveryPhotoService {

    static final String FOLDER = "deliveries";
    private static final List<String> EXTENSIONS = List.of("jpg", "jpeg", "png", "webp");

    private final Path dir;
    private final FileStorageService fileStorage;

    public DeliveryPhotoService(@Value("${app.upload-dir:uploads}") String uploadDir, FileStorageService fileStorage) {
        this.dir = Path.of(uploadDir).toAbsolutePath().normalize().resolve(FOLDER);
        this.fileStorage = fileStorage;
    }

    /** Kiểm tra ảnh trước khi đổi trạng thái đơn: bắt buộc có, tối đa 5 MB, đúng JPG/PNG/WebP. */
    public void validate(MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw ApiException.badRequest("Vui lòng chụp ảnh món khi giao cho khách.");
        }
        fileStorage.validateMenuImage(photo); // dùng lại phần kiểm tra ảnh có sẵn (dung lượng, định dạng, nội dung)
    }

    /** Lưu ảnh của đơn giao, thay ảnh cũ nếu có. */
    public void save(Long deliveryId, MultipartFile photo) {
        String original = photo.getOriginalFilename() == null ? "" : photo.getOriginalFilename().toLowerCase(Locale.ROOT);
        String ext = original.substring(original.lastIndexOf('.') + 1);
        try (InputStream in = photo.getInputStream()) {
            Files.createDirectories(dir);
            for (String e : EXTENSIONS) Files.deleteIfExists(dir.resolve(fileName(deliveryId, e)));
            Files.copy(in, dir.resolve(fileName(deliveryId, ext)), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được ảnh giao hàng, vui lòng thử lại.");
        }
    }

    /** Đường dẫn ảnh (/uploads/deliveries/delivery-15.jpg) hoặc null nếu đơn chưa có ảnh. */
    public String urlOf(Long deliveryId) {
        if (deliveryId == null) return null;
        for (String e : EXTENSIONS) {
            if (Files.exists(dir.resolve(fileName(deliveryId, e)))) {
                return "/uploads/" + FOLDER + "/" + fileName(deliveryId, e);
            }
        }
        return null;
    }

    private static String fileName(Long deliveryId, String ext) {
        return "delivery-" + deliveryId + "." + ext;
    }
}
