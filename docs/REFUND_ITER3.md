# Hoàn tiền — ThangNN Iter3 (Template 6 "Refund & Loyalty Reversal")

## Cài đặt

1. Database đang chạy: chạy `database/V9__refund_note.sql` một lần (thêm cột `payments.note`). Cài mới từ FREEZE thì không cần.
2. Backend dùng `ddl-auto=none`: chưa chạy V9 thì mọi chỗ đọc bảng `payments` sẽ lỗi thiếu cột.
3. Chạy test: `mvn test -Dtest=RefundServiceTest,CashierHistoryServiceTest,RevenueServiceTest`.

## Cách lưu (không thêm bảng)

Mỗi lần hoàn tiền = 1 dòng `payments` mới: `order_id` = đơn được hoàn, `payment_code` = `RFyyMMdd-0001`,
`total_amount` = tiền trả khách, `payment_status` = `REFUND_PENDING` (chờ chuyển khoản) / `REFUNDED` (đã trả),
`note` = món hoàn + lý do + điểm + mã giao dịch. Hóa đơn gốc giữ nguyên `PAID`; hóa đơn gốc của phiếu = `orders.payment_id`.
Điểm đảo ngược ghi `loyalty_transactions` type `REFUND`, gắn hóa đơn gốc.

## Luồng

| Trường hợp | Ai / ở đâu | Kết quả |
|---|---|---|
| Đơn tại bàn / mang đi đã thu, món chưa mang ra | Thu ngân, Lịch sử đơn → "Hoàn tiền" | Món → Đã hủy; món đã pha xong ghi biên bản sự cố; tiền mặt = REFUNDED ngay, chuyển khoản = REFUND_PENDING |
| Đơn online đã trả QR, phục vụ chưa lấy hàng | Thu ngân, Đơn giao hàng → "Hủy & hoàn tiền" | Đơn + giao hàng → Đã hủy; phiếu chuyển khoản REFUND_PENDING cả đơn |
| Đơn online đã trả QR bị hủy (giao không thành công) | Thu ngân, Lịch sử đơn → nút "Hoàn tiền" (popup) → "Tạo phiếu hoàn" (thu ngân quyết định) | Phiếu chuyển khoản REFUND_PENDING cả đơn |
| Phiếu chờ chuyển khoản | Thu ngân, Lịch sử đơn → nút "Hoàn tiền" (popup) → nhập mã giao dịch → "Đã chuyển" | REFUNDED, giờ trả = lúc này |
| Hậu kiểm | Quản lý, menu "Hoàn tiền" | Chỉ xem, lọc theo ngày và trạng thái |

Quy tắc tính:
- Tiền hoàn = phần còn hoàn được × (giá món hoàn / giá các món còn hiệu lực), làm tròn đến đồng; hoàn hết món còn lại = trả hết phần còn lại.
- Điểm: trừ lại điểm đã cộng tương ứng số tiền hoàn (không trừ quá số dư); hoàn hết hóa đơn thì trả lại điểm đã dùng.
- Doanh thu (Quản lý) và "Đã thu" (Lịch sử đơn) trừ tiền đã hoàn theo giờ trả, đúng cách hoàn (tiền mặt / chuyển khoản).

## API

| Method | URL | Ghi chú |
|---|---|---|
| POST | `/api/cashier/refunds/preview` | `{ orderId, itemIds }` → số tiền, điểm |
| POST | `/api/cashier/refunds/orders/{orderId}/items` | `{ itemIds, reason, method, expectedAmount }` |
| POST | `/api/cashier/refunds/delivery-orders/{orderId}/cancel` | `{ reason }` — hủy đơn online đã trả QR + phiếu hoàn |
| POST | `/api/cashier/refunds/delivery-orders/{orderId}` | `{ reason? }` — phiếu hoàn cho đơn online đã hủy |
| POST | `/api/cashier/refunds/{id}/complete` | `{ bankReference }` |
| GET | `/api/cashier/refunds/pending` · `/to-refund` · `?date=` | Danh sách cho popup Hoàn tiền (Lịch sử đơn) |
| GET | `/api/manager/refunds?from=&to=` | Hậu kiểm của quản lý |

## File của người khác đã sửa (đã hỏi trước)

- ThangDT: `ShipOrderList.jsx` (nút "Hủy & hoàn tiền", link `/cashier/history?refunds=1` mở popup Hoàn tiền với đơn đã hủy).
- DanMT: `RevenueService` / `RevenueRepository` / `RevenueReportView` (trừ tiền hoàn), `RevenueReport.jsx` (1 dòng chú thích), `ManagerLayout.jsx` (1 mục menu).
