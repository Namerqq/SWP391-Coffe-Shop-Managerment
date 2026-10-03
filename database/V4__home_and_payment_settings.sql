-- Cafe Management System - V4: cấu hình trang chủ khách hàng (nhóm HOME) + thanh toán / tích điểm.
-- Chạy SAU V3__system_settings.sql. Không sửa V1/V2/V3.

-- 1) Thêm loại cấu hình mới: TEXT (đoạn văn), IMAGE (ảnh upload), URL (đường link).
ALTER TABLE system_settings DROP CHECK chk_system_settings_type;
ALTER TABLE system_settings ADD CONSTRAINT chk_system_settings_type CHECK (
    data_type IN ('STRING', 'NUMBER', 'TIME', 'BOOLEAN', 'EMAIL', 'TEXT', 'IMAGE', 'URL')
);

-- 2) Các cấu hình còn thiếu so với SRS 1.2.3 / 1.1.10 (lấy từ bản V3 cũ của nhánh develop).
INSERT INTO system_settings (setting_key, setting_value, data_type, group_name, label, description, sort_order) VALUES
    ('system.public_base_url', '', 'URL', 'GENERAL', 'Địa chỉ web công khai', 'Link khách dùng để mở menu, in trong mã QR trên bàn. Để trống = dùng địa chỉ đang mở trang.', 7),
    ('inventory.default_min_stock', '0', 'NUMBER', 'GENERAL', 'Tồn kho tối thiểu gợi ý', 'Giá trị điền sẵn khi thêm nguyên liệu mới.', 8),
    ('loyalty.point_value_vnd', '1000', 'NUMBER', 'SALES', 'Giá trị 1 điểm khi dùng (VND)', 'Ví dụ 1000: dùng 10 điểm được giảm 10.000đ.', 4),
    ('payment.bank_bin', '', 'STRING', 'SALES', 'Mã ngân hàng (BIN) nhận chuyển khoản', 'Ví dụ 970436 (Vietcombank). Dùng để tạo mã VietQR khi thu ngân chọn Chuyển khoản.', 5),
    ('payment.bank_account_number', '', 'STRING', 'SALES', 'Số tài khoản nhận tiền', NULL, 6),
    ('payment.bank_account_holder', '', 'STRING', 'SALES', 'Tên chủ tài khoản', 'Viết hoa không dấu, ví dụ NGUYEN VAN A.', 7);

-- 3) Nội dung trang chủ khách hàng (Admin sửa ở Cài đặt hệ thống > Trang chủ).
INSERT INTO system_settings (setting_key, setting_value, data_type, group_name, label, description, sort_order) VALUES
    ('home.brand.name', 'Gạch Coffee', 'STRING', 'HOME', 'Tên thương hiệu', 'Hiện ở logo chữ, tiêu đề và chân trang.', 1),
    ('home.brand.tagline', 'Mộc mạc như viên gạch, đậm đà như ly cà phê phin Việt.', 'TEXT', 'HOME', 'Câu giới thiệu ngắn', 'Hiện ở chân trang.', 2),
    ('home.brand.logo', '', 'IMAGE', 'HOME', 'Logo (giữa thanh menu)', 'Để trống sẽ hiện logo chữ theo tên thương hiệu. Nên dùng ảnh PNG nền trong.', 3),
    ('home.brand.vn_logo', '', 'IMAGE', 'HOME', 'Logo Việt Nam (cuối thanh menu)', 'Để trống sẽ hiện cờ Việt Nam mặc định.', 4),
    ('home.hero1.image', '', 'IMAGE', 'HOME', 'Ảnh banner 1', 'Ảnh ngang, nên rộng từ 1600px.', 5),
    ('home.hero1.title', 'Cà phê phin, rang mộc mỗi tuần', 'STRING', 'HOME', 'Tiêu đề banner 1', NULL, 6),
    ('home.hero1.subtitle', 'Robusta Buôn Ma Thuột và Arabica Cầu Đất, pha chậm để giữ trọn vị đậm và hậu ngọt.', 'TEXT', 'HOME', 'Mô tả banner 1', NULL, 7),
    ('home.hero2.image', '', 'IMAGE', 'HOME', 'Ảnh banner 2', 'Ảnh ngang, nên rộng từ 1600px.', 8),
    ('home.hero2.title', 'Trà trái cây cho ngày nắng', 'STRING', 'HOME', 'Tiêu đề banner 2', NULL, 9),
    ('home.hero2.subtitle', 'Trà đào cam sả, trà vải hoa hồng: thanh mát, ít ngọt, uống mãi không ngán.', 'TEXT', 'HOME', 'Mô tả banner 2', NULL, 10),
    ('home.hero3.image', '', 'IMAGE', 'HOME', 'Ảnh banner 3', 'Ảnh ngang, nên rộng từ 1600px.', 11),
    ('home.hero3.title', 'Sắp có đặt hàng online', 'STRING', 'HOME', 'Tiêu đề banner 3', NULL, 12),
    ('home.hero3.subtitle', 'Chọn món trên web, trả bằng QR hoặc khi nhận hàng. Nhân viên quán giao tận nơi.', 'TEXT', 'HOME', 'Mô tả banner 3', NULL, 13),
    ('home.feature1.image', '', 'IMAGE', 'HOME', 'Ảnh khối giới thiệu 1', NULL, 14),
    ('home.feature1.title', 'Cà phê', 'STRING', 'HOME', 'Tiêu đề khối giới thiệu 1', NULL, 15),
    ('home.feature1.desc', 'Từ ly phin sữa đá quen thuộc đến bạc xỉu, cold brew. Hạt được rang tại quán và xay ngay trước khi pha.', 'TEXT', 'HOME', 'Mô tả khối giới thiệu 1', NULL, 16),
    ('home.feature2.image', '', 'IMAGE', 'HOME', 'Ảnh khối giới thiệu 2', NULL, 17),
    ('home.feature2.title', 'Trà', 'STRING', 'HOME', 'Tiêu đề khối giới thiệu 2', NULL, 18),
    ('home.feature2.desc', 'Trà ủ lạnh kết hợp trái cây theo mùa. Vị thanh, thơm tự nhiên, không dùng hương liệu.', 'TEXT', 'HOME', 'Mô tả khối giới thiệu 2', NULL, 19),
    ('home.feature3.image', '', 'IMAGE', 'HOME', 'Ảnh khối giới thiệu 3', NULL, 20),
    ('home.feature3.title', 'Đá xay và bánh', 'STRING', 'HOME', 'Tiêu đề khối giới thiệu 3', NULL, 21),
    ('home.feature3.desc', 'Matcha, cookie đá xay cùng bánh nướng mỗi sáng cho buổi chiều thong thả.', 'TEXT', 'HOME', 'Mô tả khối giới thiệu 3', NULL, 22),
    ('home.origin.image', '', 'IMAGE', 'HOME', 'Ảnh nguồn gốc', NULL, 23),
    ('home.origin.title', 'Câu chuyện của Gạch', 'STRING', 'HOME', 'Tiêu đề nguồn gốc', NULL, 24),
    ('home.origin.content', 'Gạch Coffee bắt đầu từ một căn nhà nhỏ lát gạch đỏ, nơi nhóm bạn trẻ yêu cà phê Việt rủ nhau rang những mẻ hạt đầu tiên.\nChúng tôi chọn tên Gạch vì muốn quán mộc mạc, bền bỉ và gần gũi như chính những viên gạch ấy: mỗi ly đều được làm chậm rãi và tử tế.', 'TEXT', 'HOME', 'Nội dung nguồn gốc', 'Xuống dòng để tách đoạn. Tối đa 500 ký tự.', 25),
    ('home.services.heading', 'Phục vụ theo cách bạn muốn', 'STRING', 'HOME', 'Tiêu đề khu dịch vụ', NULL, 26),
    ('home.service1.title', 'Uống tại quán', 'STRING', 'HOME', 'Tên dịch vụ 1', NULL, 27),
    ('home.service1.desc', 'Không gian gạch mộc, wifi mạnh. Quét mã QR trên bàn để gọi món, không cần chờ.', 'TEXT', 'HOME', 'Mô tả dịch vụ 1', NULL, 28),
    ('home.service2.title', 'Mang đi', 'STRING', 'HOME', 'Tên dịch vụ 2', NULL, 29),
    ('home.service2.desc', 'Gọi món tại quầy, nhận đồ uống sau vài phút. Tích điểm bằng số điện thoại.', 'TEXT', 'HOME', 'Mô tả dịch vụ 2', NULL, 30),
    ('home.service3.title', 'Giao tận nơi', 'STRING', 'HOME', 'Tên dịch vụ 3', NULL, 31),
    ('home.service3.desc', 'Đặt online, trả bằng QR hoặc khi nhận hàng. Đang hoàn thiện, sắp ra mắt.', 'TEXT', 'HOME', 'Mô tả dịch vụ 3', NULL, 32),
    ('home.store.title', 'Ghé quán', 'STRING', 'HOME', 'Tiêu đề khu địa chỉ', NULL, 33),
    ('home.store.address', '', 'STRING', 'HOME', 'Địa chỉ quán', 'Hiện ở khu Địa chỉ quán và chân trang.', 34),
    ('home.store.hours', '7:00 – 22:00, tất cả các ngày', 'STRING', 'HOME', 'Giờ mở cửa', NULL, 35),
    ('home.store.image', '', 'IMAGE', 'HOME', 'Ảnh quán', NULL, 36),
    ('home.contact.title', 'Cần hỗ trợ? Gọi hoặc nhắn cho quán', 'STRING', 'HOME', 'Tiêu đề khu liên hệ', NULL, 37),
    ('home.contact.hotline', '', 'STRING', 'HOME', 'Hotline', NULL, 38),
    ('home.contact.email', '', 'EMAIL', 'HOME', 'Email hỗ trợ', NULL, 39),
    ('home.contact.facebook', '', 'URL', 'HOME', 'Link Facebook / fanpage', 'Để trống sẽ ẩn.', 40);
