# Hướng dẫn đưa 3 gói lên GitHub (ThangDT, DanMT, ThangNN)

Thứ tự bắt buộc: **ThangDT merge trước**, vì gói này chứa phần nền chung (entity, phân quyền, khung màn nhân viên).
Sau đó DanMT và ThangNN merge theo thứ tự nào cũng được: phần riêng của 2 gói không trùng file nào với nhau.

## Bước 1: ThangDT

1. Mở nhánh của ThangDT (`feature-final-database`) và `git pull`.
2. Giải nén gói của ThangDT, chép **đè** toàn bộ nội dung thư mục `SWP391-Coffe-Shop-Managerment` vào thư mục dự án.
3. Commit và push:
   ```
   git add .
   git commit -m "Home co ban + nen chung cho DanMT, ThangNN"
   git push
   ```
4. Tạo Pull Request vào `develop` rồi merge.
   - Nếu GitHub báo conflict (vì `develop` có bản V3 khác và code mẫu Product): với mọi file bị conflict, **giữ bản của nhánh ThangDT**.
     Hay gặp: `database/V3__system_settings.sql`, `README.md`, `backend/src/main/resources/application.properties`,
     `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/index.html`, `frontend/package.json`.
   - Nếu sau khi merge `develop` vẫn còn code mẫu Product (`ProductController.java`, `Product.java`, `ProductList.jsx`...):
     để lại vẫn chạy được vì không file nào khác dùng tới. Có xóa hay không thì nhóm tự thống nhất.

## Bước 2: Cập nhật database (mọi người, sau Bước 1)

- Chạy `database/V4__home_and_payment_settings.sql` trên database local.
- Ai đã lỡ chạy bản V3 cũ của develop: `DROP TABLE system_settings;` rồi chạy V3 (bản mới) và V4.

## Bước 3: DanMT và ThangNN (sau Bước 1, làm song song được)

Gói của DanMT và ThangNN là **dự án đầy đủ** (database, khung, phần nền chung của ThangDT + phần của người đó),
giải nén ra là chạy được ngay. Phần chung giống hệt gói ThangDT nên khi merge Git tự gộp, không báo conflict.

```
git checkout develop
git pull
git checkout -b feature/danmt-iter1        # ThangNN: feature/thangnn-iter1
```

- Giải nén gói của mình, chép **đè** toàn bộ thư mục `SWP391-Coffe-Shop-Managerment` vào thư mục dự án.
- Chạy `git status` để kiểm tra: file thay đổi chỉ nên là file của mình
  (DanMT: `pages/barista`, `pages/waiter`, `pages/serving`, `danmt*`...; ThangNN: `pages/cashier`, `thangnn*`, `Cashier*`...).
  Nếu thấy file chung bị sửa (do code trên develop đã mới hơn gói), dùng `git checkout -- <file>` để giữ bản trên develop.
- **Không sửa** các file chung (README.md, App.jsx, registry.js, entity, file SQL...). Mỗi người chỉ sửa file route của mình:
  - DanMT: `frontend/src/routes/danmtNav.js`, `frontend/src/routes/danmtRoutes.jsx`
  - ThangNN: `frontend/src/routes/thangnnNav.js`, `frontend/src/routes/thangnnRoutes.jsx`

```
git add .
git commit -m "DanMT: pha che, phuc vu"        # ThangNN: "ThangNN: thu ngan"
git push -u origin feature/danmt-iter1
```

- Tạo Pull Request vào `develop` rồi merge. Người merge sau nên `git pull origin develop` vào nhánh mình trước khi tạo PR.

## Bước 4: Chạy thử khi đã merge đủ 3 gói

1. Backend: chạy `ProjectApplication`. Frontend: `npm run dev` (không có thư viện mới, không cần cài thêm).
2. Đăng nhập Admin, vào **Tài khoản** tạo 3 tài khoản: Thu ngân, Pha chế, Phục vụ.
3. (Tùy chọn) **Cài đặt hệ thống > Bán hàng & tích điểm**: nhập mã ngân hàng, số tài khoản, tên chủ tài khoản để thử chuyển khoản VietQR.
4. Kịch bản mang đi (thử được ngay):
   - Thu ngân > **Bán mang đi**: chọn món, bấm Thanh toán, nhập số điện thoại (đăng ký khách mới), xác nhận, in hóa đơn.
   - Pha chế > **Đơn cần pha**: đơn mới nằm ở cột Chờ pha. Bấm Bắt đầu pha, rồi Pha xong, báo mang ra.
   - Thu ngân > **Mang đi chờ giao**: bấm Đã giao cho khách.
5. Kịch bản tại bàn: cần màn tạo đơn tại bàn (QR, Gọi món) của KhoiBM. Khi đã có đơn:
   Phục vụ sửa / hủy đơn chờ pha ở **Sơ đồ bàn**, Pha chế pha, Phục vụ xác nhận ở **Món chờ mang ra**, Thu ngân **Thanh toán** bàn.
6. Trang chủ: mở http://localhost:5173/. Admin đổi chữ, ảnh ở **Cài đặt hệ thống > Trang chủ**, bấm Lưu rồi tải lại trang chủ.
