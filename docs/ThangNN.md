# ThangNN: Thu ngân (Iter1)

Điều kiện: gói ThangDT (phần nền chung) đã được merge vào `develop`. Cách đưa lên GitHub: `docs/HUONG_DAN_MERGE.md`.

## Màn hình

| Màn trong Template 6 | Đường dẫn | Use case |
|---|---|---|
| Cashier Dashboard | `/cashier` | UC-C05, UC-C06 |
| Order List / Table Map (Cashier) | `/cashier/tables` | UC-C06 |
| Bill Detail & Edit Bill | `/cashier/bill/{tableId}` | UC-C05, UC-C06 |
| Customer Lookup / Create Customer | Trong hộp Thanh toán | UC-C10, UC-C13 |
| Payment Confirmation | Hộp Thanh toán | UC-C05, C07, C08, C11, C14 |
| Receipt Preview | `/cashier/receipt/{paymentId}` | UC-C09 |
| Take-away Order (Cashier POS) | `/cashier/takeaway` | UC-C01, C02, C03, C04 |

## Quy tắc đã cài

- Bàn chỉ thanh toán được khi mọi đơn (chưa hủy) đã được phục vụ. Thanh toán xong: lượt khách đóng, bàn về trống.
- Bán mang đi: khách trả tiền trước. Đơn và thanh toán được tạo cùng lúc, sau đó đơn mới vào hàng chờ pha. Đơn mang đi không sửa, không hủy được sau khi thu tiền.
- Không tính VAT.
- Tích điểm: cứ 10.000đ thực trả (sau giảm giá) được 1 điểm (`loyalty.vnd_per_point`). Dùng điểm: 1 điểm = 1.000đ (`loyalty.point_value_vnd`). Không dùng quá số điểm khách có và không giảm quá tổng hóa đơn. Hai tỉ lệ này Admin đổi được trong Cài đặt hệ thống.
- Mỗi lần dùng / cộng điểm đều ghi lịch sử vào `loyalty_transactions` (REDEEM, EARN). Bảng `payments` lưu số tiền thực thu, nên trên hóa đơn: giảm giá = tạm tính − số tiền thực thu.
- Tiền mặt: nhập số tiền khách đưa để tính tiền thối (để trống nếu khách đưa vừa đủ).
- Chuyển khoản: hiện mã VietQR theo tài khoản ngân hàng trong Cài đặt hệ thống, thu ngân kiểm tra tiền vào rồi bấm xác nhận. Ảnh QR lấy từ img.vietqr.io nên máy cần có Internet. Xác nhận tự động qua SePay làm ở Iter2.
- "Edit Bill": theo Permission Matrix, Thu ngân không sửa / hủy món, nên phần sửa hóa đơn là chọn khách thân thiết, dùng điểm, chọn cách trả. Sửa / hủy món chờ pha do Phục vụ làm.
- Hóa đơn lấy tên quán, địa chỉ, số điện thoại từ Cài đặt hệ thống (`shop.name`, `shop.address`, `shop.phone`). Nút In hóa đơn chỉ in phần hóa đơn.

## API

| Method | URL | Mô tả |
|---|---|---|
| GET | `/api/cashier/customers?phone=0901234567` | Tìm khách thân thiết (không có thì trả 404) |
| POST | `/api/cashier/customers` | Đăng ký khách, body `{ "phoneNumber": "0901234567", "fullName": "An" }` |
| GET | `/api/cashier/payment-settings` | Tỉ lệ điểm + tài khoản nhận chuyển khoản |
| POST | `/api/cashier/sessions/{sessionId}/pay` | Thanh toán bàn, body `{ "method": "CASH", "customerId": 3, "pointsToRedeem": 10 }` |
| POST | `/api/cashier/takeaway` | Bán mang đi, body `{ "items": [...], "note": "", "method": "BANK_TRANSFER", "customerId": null, "pointsToRedeem": 0 }` |
| GET | `/api/cashier/payments/{paymentId}/receipt` | Dữ liệu hóa đơn |

Tất cả chỉ CASHIER gọi được. Sơ đồ bàn, chi tiết bàn và menu dùng API chung `/api/staff/...` (trong gói ThangDT).
Mục "Mang đi chờ giao" trong menu Thu ngân là màn của DanMT.
