# Database dùng chung của nhóm

Schema đã chốt gồm **16 bảng nghiệp vụ**:

`roles`, `users`, `customers`, `categories`, `menu_items`, `cafe_tables`,
`table_sessions`, `orders`, `order_items`, `deliveries`, `payments`,
`loyalty_transactions`, `inventory_items`, `stock_receipts`,
`stock_receipt_items`, `stock_transactions`.

## Tạo database bằng MySQL Workbench

1. Mở Workbench, chạy `CREATE DATABASE cafe_management CHARACTER SET utf8mb4;`
2. Chọn schema `cafe_management`, lần lượt mở và chạy:
   - `database/V1__schema.sql`: tạo 16 bảng, khóa ngoại, CHECK và index.
   - `database/V2__reference_data.sql`: tạo 5 role cố định.
   - `database/V3__system_settings.sql`: tạo bảng cấu hình hệ thống.
3. Nếu cần dữ liệu thử (danh mục, món, kho), chạy thêm `database/seed-dev.sql`.

`database/cafe_management_full.sql` là bản gộp thay cho V1 + V2. File này
**xóa và tạo lại toàn bộ bảng** (kể cả `users`, `system_settings`), nên chỉ dùng để
khởi tạo lại môi trường local; chạy xong nhớ chạy lại V3.

## Quy ước quan trọng

- Tiền dùng `BIGINT` và lưu theo VND, không lưu số thập phân.
- Số lượng kho dùng `DECIMAL(14,3)` để hỗ trợ kg/lít.
- `order_items` lưu snapshot giá, size và topping tại thời điểm đặt hàng.
- DINE_IN gắn với `table_session_id`; PICKUP và DELIVERY không gắn bàn.
- Một order DELIVERY có đúng tối đa một dòng trong `deliveries`.
- Thanh toán phải gắn với đúng một trong hai đối tượng: `order_id` hoặc
  `table_session_id`.
- Phiếu nhập chỉ làm tăng kho khi chuyển từ DRAFT sang RECEIVED. Việc cập nhật
  tồn kho và tạo `stock_transactions` phải thực hiện trong cùng một transaction
  của backend.
- Không xóa lịch sử thanh toán, tích điểm hay biến động kho; dùng trạng thái.

## Làm việc chung trên Git

- Sau khi V1/V2 đã được mọi thành viên dùng, không sửa nội dung hai migration này.
- Mọi thay đổi sau đó tạo migration mới: `V3__...sql`, `V4__...sql`.
- Không commit `.env`, mật khẩu DB hoặc file dữ liệu MySQL.
- Mỗi thành viên có database local riêng nhưng dùng chung các migration trong Git.

## Lưu ý với backend cũ

Backend hiện tại còn truy vấn tên bảng cũ như `staff_users` và `cafe_orders`.
Schema mới là bản chuẩn để bắt đầu refactor; cần cập nhật repository/service theo
tên bảng và cột mới trước khi bật lại seed hoặc chạy toàn bộ API cũ.

## Đăng nhập & Admin Dashboard (ThangDT)

Chức năng: Login (UC chung), UC-AD01 View Account List, UC-AD02 View Account Detail,
UC-AD03 Update Account Detail, UC-AD04 Assign Role to User, UC-AD05 Deactivate Account,
thêm / xóa tài khoản, UC-AD06 Configure System Settings.

### Chạy lần đầu

1. Tạo database `cafe_management`, chạy lần lượt `database/V1__schema.sql`,
   `database/V2__reference_data.sql`, `database/V3__system_settings.sql` (V3 tạo bảng cấu hình).
2. Backend: mở thư mục `backend` bằng IntelliJ và chạy `ProjectApplication`
   (DB mặc định `cafe_management`, user `root` / `123456`, đổi bằng biến môi trường
   `DB_URL`, `DB_USER`, `DB_PASSWORD`).
   Lần chạy đầu tự tạo Admin mặc định: **admin / Admin@123**. Đổi mật khẩu ngay sau khi đăng nhập.
3. Frontend: `cd frontend`, `npm install`, `npm run dev`, mở http://localhost:5173.

### API

| Method | URL | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | `{ identifier, password }`, identifier là username hoặc email |
| POST | `/api/auth/logout` | Hủy token |
| GET | `/api/auth/me` | Người đang đăng nhập |
| GET | `/api/admin/users?keyword=&roleId=&status=` | Danh sách tài khoản |
| GET / PUT / DELETE | `/api/admin/users/{id}` | Xem / sửa (`newPassword` trống = giữ nguyên) / xóa |
| POST | `/api/admin/users` | Thêm tài khoản |
| PATCH | `/api/admin/users/{id}/role` | `{ roleId }` |
| PATCH | `/api/admin/users/{id}/status` | `{ status: ACTIVE \| INACTIVE }` (ACTIVE cũng dùng để mở khóa) |
| GET | `/api/admin/roles` | Danh sách vai trò |
| GET / PUT | `/api/admin/settings` | Đọc / lưu cấu hình `{ "key": "value" }` |

Gửi kèm header `Authorization: Bearer <token>`. `/api/admin/**` chỉ ADMIN gọi được.

### Quy tắc đã cài

- Mật khẩu lưu BCrypt. Nhập sai quá `security.max_login_attempts` lần thì tài khoản chuyển sang LOCKED.
- Tài khoản INACTIVE / LOCKED không đăng nhập được và bị đăng xuất ngay khi Admin vô hiệu hóa.
- Admin không thể tự xóa, tự vô hiệu hóa hay tự đổi vai trò; hệ thống luôn giữ ít nhất 1 Admin hoạt động.
- Xóa chỉ thành công khi tài khoản chưa phát sinh dữ liệu (đơn, thanh toán, kho...), nếu đã có thì dùng Vô hiệu hóa.
- Token lưu trong bộ nhớ backend: khởi động lại backend thì mọi người phải đăng nhập lại.

## Trang chủ khách hàng + phần nền chung (ThangDT, Iter1)

Hướng dẫn đưa code của ThangDT, DanMT, ThangNN lên GitHub: xem `docs/HUONG_DAN_MERGE.md`.

### Cập nhật database

Chạy thêm `database/V4__home_and_payment_settings.sql` **sau V3**. V4 thêm:

- Nhóm cấu hình **HOME**: toàn bộ chữ và ảnh của trang chủ. Admin sửa ở *Cài đặt hệ thống > Trang chủ*.
- Các cấu hình còn thiếu so với SRS: tài khoản ngân hàng nhận chuyển khoản (VietQR), giá trị 1 điểm khi dùng (mặc định 1 điểm = 1.000đ), địa chỉ web công khai, tồn kho tối thiểu gợi ý.

Máy nào đã lỡ chạy bản V3 cũ của nhánh develop (bảng `system_settings` có cột `setting_id`) thì chạy
`DROP TABLE system_settings;` rồi chạy lại V3 (bản trong thư mục này) và V4.

### Trang chủ (Home - Basic)

| URL | Nội dung |
|---|---|
| `/` | Trang chủ: banner 3 ảnh tự chuyển, 3 khối giới thiệu, Nguồn gốc, Dịch vụ, Địa chỉ quán, Liên hệ hỗ trợ |
| `/thuc-don` | Thực đơn chỉ xem (món đang bán, lấy từ DB) |
| `/dat-hang-online` | Trang "Sắp ra mắt" (đặt hàng online làm ở Iter2) |

- Thanh menu: Thực đơn, Về Gạch Coffee (Địa chỉ quán, Nguồn gốc, Dịch vụ, Liên hệ hỗ trợ: bấm sẽ cuộn tới khu tương ứng), logo ở giữa, Đặt hàng online, logo Việt Nam ở cuối.
- Trang chủ tách riêng khỏi hệ thống quản lý: không có link sang trang nhân viên, nhân viên vào thẳng `/login`.
- Tên trên trang chủ (`home.brand.name`) và tên quán trong hệ thống quản lý / hóa đơn (`shop.name`) là 2 cấu hình riêng, chỉ Admin đổi được.
- Ảnh Admin tải lên được lưu ở `backend/uploads/` (đã cho vào `.gitignore`, không lên GitHub), nên mỗi máy tự tải ảnh lại. Chưa có ảnh thì trang chủ hiện nền họa tiết gạch.
- Không thêm thư viện npm nào mới.

### API mới

| Method | URL | Ai gọi | Mô tả |
|---|---|---|---|
| GET | `/api/public/home` | Khách (không cần đăng nhập) | Nội dung trang chủ |
| GET | `/api/public/menu` | Khách (không cần đăng nhập) | Thực đơn đang bán |
| POST | `/api/admin/uploads` | ADMIN | Tải ảnh (form-data `file`), trả `{ "url": "/uploads/home/..." }` |
| GET | `/api/staff/menu` | CASHIER, WAITER | Món đang bán + danh sách Size, Topping |
| GET | `/api/staff/tables` | CASHIER, WAITER | Sơ đồ bàn |
| GET | `/api/staff/tables/{tableId}/session` | CASHIER, WAITER | Lượt khách đang ngồi + các đơn của bàn |

### Phần nền chung cho cả nhóm

- **Phân quyền**: mọi `/api/**` đều cần đăng nhập, trừ `/api/auth/login` và `/api/public/**`. Gắn `@RequireRole({"CASHIER", "WAITER"})` lên Controller (hoặc từng hàm) để chỉ cho các vai trò đó gọi. `/api/admin/**` vẫn chỉ ADMIN.
- **Entity + Repository** (map đúng schema V1): Category, MenuItem, CafeTable, TableSession, Customer, Order, OrderItem, Payment, LoyaltyTransaction.
- **OrderSupportService**: tạo dòng món và tính giá (lưu lại giá, size, topping tại thời điểm gọi), sinh mã đơn `yyMMdd-0001`, mã thanh toán `PMyyMMdd-0001`, mã lượt khách `SSyyMMdd-0001`, hủy đơn chờ pha, và `currentOrOpenSession(table)` để mở lượt khách khi tạo đơn tại bàn (dành cho màn của KhoiBM).
- **Trạng thái đơn**: giữ schema V1, hiển thị theo tên trong SRS.

| DB (`orders.status`) | SRS | Hiển thị |
|---|---|---|
| `PENDING_CONFIRMATION` | PENDING | Chờ pha |
| `PREPARING` | PREPARING | Đang pha |
| `READY` | READY | Chờ mang ra |
| `COMPLETED` | SERVED | Đã phục vụ |
| payment `PAID` + lượt khách `CLOSED` | PAID | Đã thanh toán |
| `CANCELLED` | CANCELLED | Đã hủy |
| `CONFIRMED` | (chưa dùng) | Để dành cho đơn online đã trả QR (Iter2) |

- **Size / Topping**: schema V1 không có bảng riêng cho Size, Topping. Quy ước: tạo 2 danh mục tên đúng `Size` và `Topping` trong bảng `categories`. Mỗi món trong 2 danh mục này là 1 lựa chọn, `base_price` là số tiền cộng thêm. Chưa có 2 danh mục này thì hộp chọn món chỉ có đường, đá, số lượng, ghi chú.
- **Frontend dùng chung**: `layouts/StaffLayout.jsx` (khung màn nhân viên, menu trái theo vai trò), `routes/registry.js`, `components/order/` (ItemOptionsModal, TableCard, StatusPill), `utils/` (orderFormat, orderOptions, usePolling, assetUrl), `api/staffApi.js`, `styles/staff.css`.
- **Tránh conflict khi merge**: mỗi người chỉ sửa 2 file route của mình, `src/routes/<ten>Nav.js` (menu trái) và `src/routes/<ten>Routes.jsx` (đường dẫn). `App.jsx` và `registry.js` đã đọc sẵn file của DanMT, ThangNN. Thành viên khác muốn thêm màn thì tạo cặp file riêng theo mẫu đó rồi khai báo 1 lần trong `App.jsx` và `registry.js`.
