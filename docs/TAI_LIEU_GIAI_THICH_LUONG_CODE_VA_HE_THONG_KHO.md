# TÀI LIỆU TOÀN DIỆN GIẢI THÍCH LUỒNG CODE, KIẾN TRÚC & CHỈ SỐ HỆ THỐNG
## Phân hệ: Quản lý Kho (Inventory) & Luồng Pha Chế Barista (Barista Stock Flow)
**Tác giả:** Sinh viên BaoPG | **Học kỳ:** Fall 2026 | **Đồ án:** SWP391 - Coffee Shop Management System

---

## 1. Bức Tranh Tổng Thể (Big Picture)
Phân hệ Quản lý Kho và Nghiệp vụ Barista là trái tim vận hành cung ứng của chuỗi quán cà phê:
- **Manager:** Quản lý danh mục nguyên liệu, cấu hình ngưỡng cảnh báo tồn kho an toàn (`min_quantity`), quản lý phiếu nhập kho (`stock_receipts`), duyệt yêu cầu báo thiếu từ quầy (`YC-...`), theo dõi vết kiểm toán biến động kho (`stock_transactions`).
- **Barista:** Theo dõi tồn kho quầy pha chế, gửi báo thiếu nguyên liệu khi cạn hàng (`UC-B05`), báo hỏng/đổ vỡ nguyên liệu (`UC-B06`), và **tự động trừ kho theo định lượng công thức (Recipe)** khi nhấn "Nhận đơn".

---

## 2. Các Chỉ Số Kỹ Thuật Đặc Thù & Chu Kỳ Hệ Thống (Metrics & SLA)

### 2.1. Tần suất kiểm tra dữ liệu (Polling Frequency)
- **Barista Board (Bảng pha chế Kanban):** `5 giây (5000 ms)` qua hook `usePolling(load, 5000)` tại `BaristaBoard.jsx`.
- **Waiter Board & Waiter Tables:** `5 giây (5000 ms)`.
- **Cashier POS & Dashboard:** `5 giây (5000 ms)`.
- **QR Payment Notifier (SePay Webhook):** `3 giây (3000 ms)`.
- **Ship Orders (Đơn giao hàng):** `10 giây (10000 ms)`.
- **Online Tracking (Khách hàng):** `30 giây (30000 ms)`.
- **Quản lý Kho & Phiếu nhập (Manager):** `Event-driven (0 ms)` - Kích hoạt tải lại ngay lập tức khi đổi tab, tìm kiếm, hoặc lưu modal thành công.

### 2.2. Thời gian phản hồi (Response Time & SLA)
- **API Giao dịch kho & Nhận đơn:** `< 50ms - 150ms`.
- **Tốc độ thực thi SQL:** `2ms - 5ms` nhờ sử dụng `@EntityGraph` loại bỏ hoàn toàn vấn đề N+1 Query.

### 2.3. Quy tắc sinh mã tự động
- **Phiếu nhập kho:** `PN-yyyyMMdd-XXXX` (VD: `PN-20261017-0001`).
- **Phiếu báo thiếu từ Barista:** `YC-yyyyMMdd-XXXX` (VD: `YC-20261017-0001`).

### 2.4. Ngưỡng cảnh báo an toàn kho
- 🔴 **Hết hàng (Out of Stock):** `current_quantity == 0`
- 🟡 **Sắp hết hàng (Low Stock):** `0 < current_quantity <= min_quantity`
- 🟢 **Còn hàng an toàn (In Stock):** `current_quantity > min_quantity`
- Ràng buộc cơ sở dữ liệu: `CHECK (current_quantity >= 0)` ngăn chặn hoàn toàn tình trạng âm kho.

---

## 3. Các Luồng Nghiệp Vụ Chi Tiết
1. **UC-IV01 - Quản lý nguyên liệu:** Xem tồn kho, tìm kiếm, lọc cảnh báo sắp hết hàng, cấu hình định mức tồn tối thiểu.
2. **UC-IV02 & UC-IV04 - Quản lý Phiếu nhập kho:** Vận hành theo mô hình State Machine:
   - `DRAFT` (Bản nháp / Chờ duyệt): Có thể sửa đổi số lượng, giá cả, thêm/xóa dòng hàng.
   - `RECEIVED` (Đã nhập kho): Duyệt phiếu -> Cộng tồn kho nguyên tử, cập nhật giá vốn mới nhất (`cost_per_unit`), sinh bản ghi kiểm toán `STOCK_IN`, khóa sửa đổi.
   - `CANCELLED` (Đã hủy): Hủy phiếu dự kiến, không thay đổi kho.
3. **UC-B05 & UC-IV03 - Báo thiếu nguyên liệu:** Barista mở modal báo thiếu tại quầy -> Tạo phiếu `YC-...` ở trạng thái `DRAFT` gửi Manager duyệt.
4. **UC-B06 - Báo hỏng nguyên liệu (Waste Flow):** Barista báo đổ vỡ, hư hỏng, quá hạn -> Trừ tồn kho tức thì, sinh bản ghi kiểm toán loại `WASTE` kèm lý do.
5. **Tính năng cải tiến - Tự động trừ kho theo công thức khi Barista nhận đơn:**
   - Barista bấm **"Nhận đơn (Tự động trừ kho)"** tại `BaristaBoard.jsx`.
   - Backend quét tất cả món trong đơn, tra cứu định lượng công thức trong bảng `recipes` & `recipe_ingredients` (bao gồm cả Topping).
   - Tổng hợp nhu cầu nguyên liệu và **Pre-check tồn kho**. Nếu thiếu nguyên liệu, chặn lại ngay lập tức và trả về HTTP 400 Bad Request thông báo chi tiết thiếu món gì, còn bao nhiêu.
   - Nếu đủ, trừ kho tự động và ghi nhật ký `STOCK_OUT` với ghi chú: *"Pha chế đơn #{orderNumber} (Tự động trừ kho theo công thức)"*.
   - Đảm bảo tính nguyên tử với `@Transactional` (ACID).

---

## 4. Bộ Câu Hỏi Phản Biện Trọng Tâm (Defense Q&A Cheatsheet)
*(Xem chi tiết trong file Word TAI_LIEU_GIAI_THICH_LUONG_CODE_VA_HE_THONG_KHO.doc)*
- Xử lý Race Condition / Concurrency khi nhiều người nhận đơn / nhập kho cùng lúc.
- Tại sao dùng Polling 5s thay vì WebSocket?
- Tại sao cần trạng thái DRAFT cho phiếu nhập?
- Vai trò của bảng kiểm toán `stock_transactions` và quy tắc bất biến (Immutability).
- Cách giải quyết lỗi `LazyInitializationException` bằng `@EntityGraph`.
