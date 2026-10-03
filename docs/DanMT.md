# DanMT: Pha chế, Phục vụ, Món chờ mang ra (Iter1)

Điều kiện: gói ThangDT (phần nền chung) đã được merge vào `develop`. Cách đưa lên GitHub: `docs/HUONG_DAN_MERGE.md`.

## Màn hình

| Màn trong Template 6 | Đường dẫn | Use case |
|---|---|---|
| Barista Dashboard + Order Queue (Kanban) | `/barista` | UC-B01, UC-B03 |
| Order Detail (Barista) | Bấm số đơn trên thẻ đơn (hộp chi tiết) | UC-B02, UC-B03 |
| Waiter Dashboard & Table List | `/waiter` | UC-W01, UC-W05 |
| Order Detail & Edit Pending Order (Waiter) | `/waiter/tables/{tableId}` | UC-W05, UC-W06, UC-W07 |
| Order Ready to Serve (Waiter + cashier) | `/waiter/ready` (Phục vụ), `/cashier/pickup-ready` (Thu ngân) | UC-W08 |

Theo mockup SRS 1.5.1.1 và 1.5.1.2, Barista Dashboard và Order Queue là cùng một trang.

## Quy tắc đã cài

- Các màn tự tải lại mỗi 5 giây, đơn đến trước (hoặc chờ lâu nhất) nằm trên.
- Luồng trạng thái: Chờ pha, bấm Bắt đầu pha thành Đang pha, bấm Pha xong thành Chờ mang ra, Phục vụ / Thu ngân xác nhận thành Đã phục vụ.
- "Tổng cần pha": gộp các món của đơn Chờ pha và Đang pha. Bấm vào 1 món để tô sáng những đơn có món đó.
- Hết nguyên liệu (BF-02): Pha chế hủy được đơn còn Chờ pha, bắt buộc ghi nguyên liệu bị thiếu. Đơn mang đi đã thu tiền thì không hủy ở đây (phải hoàn tiền, báo thu ngân).
- Phục vụ chỉ sửa món, bỏ món, hủy đơn được với đơn tại bàn còn Chờ pha (GB-02). Bỏ món: đơn phải còn ít nhất 1 món, muốn bỏ hết thì hủy đơn. Sửa món thì giá tính lại theo menu hiện tại.
- Nút công thức trên từng món: xem nguyên liệu và cách pha (lấy từ `menu_items.recipe_ingredients`, `recipe_instructions`).
- Phục vụ thấy đơn tại bàn ở Món chờ mang ra. Thu ngân thấy đơn mang đi ở Mang đi chờ giao.

## Chưa gắn (ngoài phạm vi Iter1 của DanMT)

- Nút "Gọi món" (màn Assist Order của KhoiBM), "Báo thiếu nguyên liệu" và Kho (BaoPG), trang Công thức đầy đủ (Iter2).
- Bộ lọc "Đang gọi nhân viên" trên sơ đồ bàn: database chưa có bảng lưu yêu cầu gọi nhân viên.

## API

| Method | URL | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/barista/orders` | BARISTA | Đơn Chờ pha / Đang pha / Chờ mang ra |
| GET | `/api/barista/orders/{id}` | BARISTA | Chi tiết 1 đơn |
| PATCH | `/api/barista/orders/{id}/start` | BARISTA | Chờ pha thành Đang pha |
| PATCH | `/api/barista/orders/{id}/ready` | BARISTA | Đang pha thành Chờ mang ra |
| PATCH | `/api/barista/orders/{id}/cancel` | BARISTA | Hủy vì hết nguyên liệu, body `{ "reason": "Hết sữa tươi" }` |
| GET | `/api/barista/recipes/{menuItemId}` | BARISTA | Công thức 1 món |
| PUT | `/api/waiter/orders/{orderId}/items/{itemId}` | WAITER | Sửa 1 món (số lượng, size, đường, đá, topping, ghi chú) |
| DELETE | `/api/waiter/orders/{orderId}/items/{itemId}` | WAITER | Bỏ 1 món |
| PATCH | `/api/waiter/orders/{orderId}/cancel` | WAITER | Hủy đơn, body `{ "reason": "..." }` (không bắt buộc) |
| GET | `/api/serving/ready?type=DINE_IN` hoặc `PICKUP` | WAITER, CASHIER | Đơn chờ mang ra |
| PATCH | `/api/serving/orders/{id}/served` | WAITER, CASHIER | Xác nhận đã mang ra / đã giao |

Sơ đồ bàn và chi tiết bàn dùng API chung `/api/staff/tables` (trong gói ThangDT).
