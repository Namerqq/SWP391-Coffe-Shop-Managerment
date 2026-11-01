# Database FREEZE 1.0 — bản demo local

File duy nhất: `cafe_management_FREEZE_1.0.sql`. Theo yêu cầu ngày 16/10/2026, bản trong project được bổ sung trực tiếp hai cột Menu Iter 2 và dữ liệu menu demo. Đây là bản demo mở rộng từ snapshot của nhóm, không còn giống từng byte với snapshot gốc.

## Nội dung

- 19 bảng ứng dụng, role và cài đặt mặc định từ snapshot.
- `categories.category_type` và `menu_items.sell_standalone` đã nằm trong CREATE TABLE; **không chạy ALTER bổ sung lần nữa**.
- 7 danh mục ACTIVE, 20 món bán riêng: 13 đồ uống, 3 bánh, 4 topping.
- 2 lựa chọn Size M/L được lưu thêm trong menu_items, không tính vào 20 món bán riêng. Tổng dòng menu_items là 22.
- Topping vừa thêm vào ly vừa bán riêng; Size không bán riêng.
- Ảnh để NULL, giao diện hiện biểu tượng mặc định. Không phụ thuộc file upload trên máy này.
- Không seed bàn, tài khoản, khách hàng, đơn hay thanh toán trong file demo này. Backend tạo Admin mặc định theo cấu hình local nếu chưa có.

## Cài mới bằng Workbench

1. Dùng MySQL 8.0.16 trở lên và schema `cafe_management` rỗng.
2. Mở file SQL và chạy toàn bộ. File tự tạo/chọn schema `cafe_management`.
3. Cấu hình DB_URL, DB_USER, DB_PASSWORD ở máy local rồi chạy backend.
4. Không chạy lại file trên database đã có bảng/dữ liệu; không có DROP/TRUNCATE để xoá dữ liệu cũ.

Ứng dụng không có Flyway, Hibernate dùng ddl-auto=none. Nếu chạy trên schema khác, đổi đồng thời CREATE DATABASE và USE trong bản sao dùng để import; không chỉ đổi DB_URL.

## Database đang chạy trên máy này

Backend 8087 vẫn kết nối `cafe_management_freeze_local` qua `backend/application-default.properties`; database này đã có 20 món và 6 bàn từ các bước trước. Việc sửa file SQL không import lại hay xoá database runtime.

Bản snapshot gốc và bản sao trước sửa được giữ ngoài project trong thư mục Codex outputs. Khi gửi PR, ghi rõ file này là bản demo mở rộng có thay đổi schema và seed để nhóm review.

## V9 — Hoàn tiền (ThangNN Iter3)

- Database đang chạy (đã có dữ liệu): chạy `V9__refund_note.sql` một lần. Script chỉ thêm cột `payments.note`.
- Cài mới từ `cafe_management_FREEZE_1.0.sql`: cột `note` đã nằm sẵn trong CREATE TABLE payments, **không chạy V9 nữa**.
- Không thêm bảng. Mỗi lần hoàn tiền là 1 dòng `payments` có `payment_status` = `REFUND_PENDING` / `REFUNDED`, mã `RF...`, gắn `order_id` của đơn được hoàn. Query nào cộng tiền trên `payments` phải lọc theo `payment_status`.
