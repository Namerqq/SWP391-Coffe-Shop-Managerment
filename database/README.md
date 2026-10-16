# Database FREEZE 1.0 của nhóm

Thư mục này chỉ có một SQL khởi tạo: `cafe_management_FREEZE_1.0.sql`. Nội dung được giữ nguyên từ bản nhóm cung cấp.

## Cài mới

1. Dùng MySQL 8.0.16 trở lên, schema rỗng. Không chạy đè database có dữ liệu.
2. Trong Workbench mở SQL và chạy toàn bộ. File tự tạo/chọn schema `cafe_management`, tạo 19 bảng, 5 role và cài đặt mặc định.
3. Backend Menu Iter 2 cần hai cột bổ sung bên dưới. Chạy sau khi chọn đúng schema mới.
4. Cấu hình `DB_URL`, `DB_USER`, `DB_PASSWORD` ở máy local; không commit mật khẩu.

```sql
ALTER TABLE categories
  ADD COLUMN category_type VARCHAR(20) NOT NULL DEFAULT 'DRINK',
  ADD CONSTRAINT chk_category_type
    CHECK (category_type IN ('DRINK','FOOD','TOPPING','SIZE'));
ALTER TABLE menu_items
  ADD COLUMN sell_standalone BOOLEAN NOT NULL DEFAULT TRUE;
```

Chỉ chạy bước bổ sung một lần trên database mới chưa có hai cột này. Không sửa file FREEZE để tránh thay đổi bản đã chốt của nhóm. Nếu nâng cấp database có dữ liệu, cần kế hoạch phân loại danh mục riêng.

## Máy local hiện tại — 16/10/2026

- Schema đang dùng: `cafe_management_freeze_local`, tạo từ FREEZE và đã bổ sung hai cột.
- Backend 8087, cấu hình `backend/application-default.properties`; frontend 5173, cấu hình `frontend/.env.local`.
- Database cũ `cafe_management_integrated` vẫn nguyên vẹn. Không chép dữ liệu cũ sang schema mới.
- Snapshot không chứa món, bàn hoặc tài khoản demo. Menu ban đầu trống; backend tạo Admin ban đầu theo cấu hình local nếu chưa tồn tại.
- Không cấu hình Flyway trong pom.xml. Hibernate dùng `ddl-auto=none`, không tự thêm bảng/cột.
