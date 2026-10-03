# Database dùng chung của nhóm

Schema đã chốt gồm **16 bảng nghiệp vụ**:

`roles`, `users`, `customers`, `categories`, `menu_items`, `cafe_tables`,
`table_sessions`, `orders`, `order_items`, `deliveries`, `payments`,
`loyalty_transactions`, `inventory_items`, `stock_receipts`,
`stock_receipt_items`, `stock_transactions`.

## Cách 1 — Chạy ứng dụng bằng Flyway (khuyến nghị)

Tạo database rỗng tên `cafe_management`, cấu hình `DB_URL`, `DB_USER`,
`DB_PASSWORD`, sau đó chạy backend. Flyway sẽ tự chạy:

1. `V1__schema.sql`: tạo 16 bảng, khóa ngoại, CHECK và index.
2. `V2__reference_data.sql`: tạo 5 role cố định.

Không chạy `database/schema.sql` trước rồi mới bật Flyway trên cùng database,
vì Flyway sẽ cho rằng schema chưa được quản lý.

## Cách 2 — Chạy trực tiếp bằng MySQL Workbench

1. Mở Workbench và kết nối bằng tài khoản có quyền tạo database.
2. Mở và chạy `database/schema.sql` để tạo database sạch.
3. Mở `backend/src/main/resources/db/migration/V1__schema.sql`, chọn schema
   `cafe_management`, rồi chạy toàn bộ file để tạo 16 bảng.
4. Mở và chạy `backend/src/main/resources/db/migration/V2__reference_data.sql`
   để tạo 5 role cố định.
5. Nếu cần dữ liệu thử, mở và chạy `database/seed-dev.sql`.

`schema.sql` có `DROP DATABASE`, vì vậy chỉ dùng để khởi tạo lại môi trường local;
không chạy trên database có dữ liệu cần giữ.

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
