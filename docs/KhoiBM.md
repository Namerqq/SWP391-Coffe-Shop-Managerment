# KhoiBM: Khách gọi món tại bàn + Phục vụ gọi món giúp (Iter1)

Điều kiện: phần nền chung của ThangDT đã có trên `Develop`. Cách đưa lên GitHub: `docs/HUONG_DAN_MERGE.md`
và `HUONG_DAN_COMMIT.md` (gói chia commit).

## Màn hình

| Màn trong Template 6 | Đường dẫn | Use case |
|---|---|---|
| Customer Menu (QR Table) | `/menu?table=<mã QR bàn>` (vd `/menu?table=TABLE-01`) | UC-CU01 |
| Item Customize Modal | Bấm nút + ở món | UC-CU02 |
| Cart & Confirm Order | `/cart` | UC-CU02 |
| Order Tracking (Customer) | `/orders` | UC-CU03 |
| Assist Order (Waiter) | `/waiter/assist-order` (mục "Gọi món" trong menu Phục vụ), mở nhanh 1 bàn: `?table=<tableId>` | UC-W01 |

## Quy tắc đã cài

- Khách không cần đăng nhập. Quét QR thì server cấp 1 mã phiên gắn với bàn (lưu trên máy khách, gửi lại ở header `X-Guest-Token`).
  Phiên giữ 8 giờ. Khởi động lại backend thì khách quét lại QR (đơn trong database không mất).
- Không còn bàn cố định T-08: bàn lấy theo mã QR trong bảng `cafe_tables` (`seed-dev.sql` có `TABLE-01` … `TABLE-06`). Màn tạo / in mã QR làm ở Iter2.
- Chưa quét QR vẫn xem được thực đơn nhưng không thêm món, không gửi đơn được.
- Giỏ hàng lưu theo từng bàn trên máy khách, sửa thoải mái trước khi gửi. Gửi lại sau lỗi mạng không tạo đơn trùng (requestKey).
- Đơn mới: Chờ pha (`PENDING_CONFIRMATION`), nguồn `QR_TABLE` (khách) hoặc `STAFF` (phục vụ), mã đơn chung `yyMMdd-0001`,
  mở lượt khách cho bàn nếu chưa có. Bàn đang thanh toán thì không nhận thêm đơn.
- Theo dõi đơn: Chờ pha, Đang pha, Chờ mang ra, Đã phục vụ (giống màn Pha chế / Phục vụ), tự cập nhật mỗi 5 giây.
- Khách chỉ hủy được đơn của mình khi còn Chờ pha (khóa dòng đơn để không đè thao tác của pha chế). Hủy hết đơn thì bàn tự trả về trống.
- Size / Topping theo quy ước chung: danh mục tên `Size`, `Topping` trong DB; đường, đá: 100/70/50/30/0%.
  Chạy `database/seed-options-dev.sql` để có sẵn Size M (0đ), L (+10.000đ), topping Thêm espresso, Kem sữa (+10.000đ).
- Giao diện khách: khung riêng gọn cho điện thoại (logo lấy từ cài đặt trang chủ, tab Thực đơn / Giỏ hàng / Đơn của tôi),
  màu và font theo theme chung. CSS chỉ dùng lớp `gx-*` (`styles/guest.css`) nên không ảnh hưởng màn khác.

## Thay đổi so với bản cũ của KhoiBM

- Backend viết lại theo nền chung (entity + `OrderSupportService`) thay vì JDBC riêng.
- Bỏ Flyway: database chạy tay V1 → V4 như cả nhóm.
- Bỏ đăng nhập nhân viên riêng: Assist Order dùng đăng nhập chung (vai trò WAITER).
- Bỏ code thừa: Product mẫu, màn nhân viên cũ, test Flyway, `theme.css` 2.000 dòng.
- Nhánh cũ của KhoiBM không dùng nữa: tạo nhánh mới từ `Develop` theo hướng dẫn.

## Thử nhanh

1. Chạy V1 → V4, `seed-dev.sql`, rồi `seed-options-dev.sql`.
2. Mở `http://localhost:5173/menu?table=TABLE-01`, thêm món, gửi đơn, xem ở Đơn của tôi.
3. Pha chế bắt đầu pha (màn DanMT), trạng thái bên khách tự đổi.
4. Đăng nhập Phục vụ, vào **Gọi món**, chọn bàn, thêm món, gửi.

Thử bằng điện thoại cùng Wi-Fi: chạy `npm run dev -- --host`, mở `http://<IP máy tính>:5173/menu?table=TABLE-01`,
và trong `frontend/.env` đặt `VITE_API_URL=http://<IP máy tính>:8080/api`, thêm `http://<IP máy tính>:5173` vào `app.cors.allowed-origins`.

## API

| Method | URL | Ai gọi | Mô tả |
|---|---|---|---|
| POST | `/api/public/order/table` | Khách | Quét QR, body `{ "qrCode": "TABLE-01" }`, trả `{ token, tableId, tableNumber }` |
| GET | `/api/public/order/context` | Khách | Phiên hiện tại (204 nếu chưa quét QR) |
| GET | `/api/public/order/menu` | Khách | Món đang bán + Size + Topping |
| POST | `/api/public/order/orders` | Khách | Gửi đơn `{ items, note, requestKey }` |
| GET | `/api/public/order/orders` | Khách | Đơn của khách trong phiên |
| POST | `/api/public/order/orders/{id}/cancel` | Khách | Hủy đơn Chờ pha, body `{ "reason": "..." }` (không bắt buộc) |
| POST | `/api/waiter/assist-orders` | WAITER | Gọi món giúp `{ tableId, items, note }` |

API khách gửi kèm header `X-Guest-Token`. Phiên hết hạn trả 410 (không phải 401, để trang khách không bị chuyển sang trang đăng nhập).
