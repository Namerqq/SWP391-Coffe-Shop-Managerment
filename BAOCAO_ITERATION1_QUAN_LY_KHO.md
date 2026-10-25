# ĐỒ ÁN SWP391 - COFFEE SHOP MANAGEMENT SYSTEM
## TÀI LIỆU BÁO CÁO & HƯỚNG DẪN THUYẾT TRÌNH ITERATION 1 (INTEGRATION 1)
**Phân hệ:** Quản lý Kho (Manager) & Tra cứu Tồn kho (Barista)  
**Tác giả:** Thành viên phụ trách Module Inventory  

---

## 1. TỔNG QUAN DỰ ÁN & VỊ TRÍ PHÂN HỆ TRONG TOÀN BỘ HỆ THỐNG (BIG PICTURE)

Dự án **Coffee Shop Management System** là hệ thống quản lý tổng thể cho chuỗi quán cà phê vận hành theo thời gian thực (Real-time). Hệ thống bao gồm 4 đối tượng người dùng chính:
* **Khách hàng (Guest):** Quét mã QR tại bàn, xem thực đơn số, đặt món và theo dõi đơn hàng trực tuyến.
* **Nhân viên phục vụ (Waiter):** Hỗ trợ gọi món tại bàn, kiểm tra bàn trống, chuyển yêu cầu vào quầy pha chế.
* **Nhân viên pha chế (Barista):** Nhận danh sách đơn hàng cần pha chế, kiểm tra công thức (recipes), kiểm tra tồn kho nguyên liệu, xác nhận hoàn thành món.
* **Quản lý (Manager):** Quản lý danh mục nguyên liệu, thực hiện nhập kho, theo dõi chỉ số tồn kho an toàn và doanh thu.

### Ý nghĩa cốt lõi của Phân hệ Quản lý Kho (Inventory Module):
Kho nguyên liệu là **nền tảng cung ứng (Supply Foundation)** của toàn bộ quán cà phê:
1. Nếu không có dữ liệu kho chính xác, Barista sẽ không biết liệu quán còn đủ hạt cà phê, sữa tươi hay siro để pha chế hay không.
2. Khách hàng có thể đặt những món mà quầy pha chế đã cạn nguyên liệu, gây trải nghiệm tệ.
3. Manager không nắm được mặt hàng nào sắp hết để kịp thời nhập hàng từ nhà cung cấp.

```
[Khách / Waiter đặt món] ──> [Barista nhận món] ──> [Kiểm tra Kho (UC-B04)] ──> [Pha chế]
                                  ▲
                                  │ (Cung cấp nguyên liệu)
[Manager Quản lý & Nhập kho (UC-IV01, UC-IV02)] ──> [Cập nhật Số dư Kho]
```

---

## 2. CÁC USE CASE ĐÃ HIỆN THỰC TRONG ITERATION 1

| Mã Use Case | Tên chức năng | Vai trò (Actor) | Mô tả chi tiết & Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **UC-IV01** | **Quản lý nguyên liệu (Manage Inventory Items)** | `MANAGER` | - Xem danh sách toàn bộ nguyên liệu kèm tồn kho thực tế, đơn vị tính, đơn giá vốn.<br>- Tìm kiếm tức thời theo tên nguyên liệu.<br>- Bộ lọc hiển thị nguyên liệu *"Sắp hết hàng / Chạm ngưỡng báo động"*.<br>- Thêm mới nguyên liệu: hỗ trợ nhập số dư ban đầu (opening quantity).<br>- Chỉnh sửa thông tin: đổi tên, đơn vị tính, định mức tồn tối thiểu, giá vốn. |
| **UC-IV02** | **Nhập kho nguyên liệu (Stock-In)** | `MANAGER` | - Tạo phiếu nhập kho bổ sung số lượng cho nguyên liệu đã chọn.<br>- Xem trực quan: [Tồn hiện tại] + [Số lượng nhập] ➔ [Tồn dự kiến sau nhập].<br>- Ghi chú nhà cung cấp / số hóa đơn chứng từ.<br>- Tự động cộng dồn số lượng và tạo bản ghi lịch sử giao dịch (Audit Log). |
| **UC-B04** | **Xem tồn kho (View Inventory)** | `BARISTA` | - Màn hình dành riêng cho quầy pha chế với quyền **Chỉ xem (Read-only)**.<br>- Thẻ trạng thái màu sắc rõ ràng: **Sắp hết hàng** (Đỏ) hoặc **Đủ dùng** (Xanh).<br>- Giúp Barista chủ động chuẩn bị nguyên liệu trước giờ cao điểm hoặc báo Manager nhập hàng. |

---

## 3. KIẾN TRÚC HỆ THỐNG & LUỒNG DỮ LIỆU (SYSTEM ARCHITECTURE)

Phân hệ được tổ chức theo kiến trúc 3 lớp (**3-Tier Layered Architecture**) chuẩn công nghiệp:

### Sơ đồ luồng tương tác End-to-End:
```
1. Giao diện người dùng (ReactJS Components):
   ManagerOverview.jsx / InventoryList.jsx / StockInModal.jsx / BaristaInventory.jsx
                   │
                   ▼
2. Tầng API Client (Axios - inventoryApi.js):
   Đóng gói HTTP Requests (GET, POST, PUT), quản lý header và URL.
                   │
                   ▼
3. Tầng Security & Controller (Spring Boot REST):
   - AuthInterceptor kiểm tra Token & phân quyền: @RequireRole("MANAGER") hoặc @RequireRole("BARISTA")
   - ManagerInventoryController.java / BaristaController.java tiếp nhận DTO Request.
                   │
                   ▼
4. Tầng Xử lý Nghiệp vụ (InventoryService.java):
   - Quản lý Transaction (@Transactional).
   - Kiểm tra logic: chống trùng tên, tính toán số lượng tồn kho, kiểm tra ngưỡng cảnh báo.
                   │
                   ▼
5. Tầng Truy vấn Dữ liệu (Spring Data JPA Repositories):
   - InventoryItemRepository.java (Custom JPQL Query)
   - StockTransactionRepository.java
                   │
                   ▼
6. Cơ sở dữ liệu (MySQL Database):
   Bảng inventory_items và bảng stock_transactions.
```

---

## 4. CHI TIẾT CÁC THÀNH PHẦN & FUNCTIONS ĐÃ HIỆN THỰC

### 4.1. Tầng Cơ Sở Dữ Liệu & Thực Thể (Backend Entities)
* **`InventoryItem.java` (Bảng `inventory_items`):**
  * `itemName`: Tên nguyên liệu (Cafe Robusta, Sữa tươi tiệt trùng, Đường cát...).
  * `unit`: Đơn vị tính (gam, ml, hộp, kg).
  * `currentQuantity`: Số lượng tồn kho hiện tại (kiểu `BigDecimal` để đảm bảo độ chính xác).
  * `minimumStockLevel`: Định mức tồn tối thiểu. Khi `currentQuantity <= minimumStockLevel`, hệ thống kích hoạt cảnh báo đỏ.
  * `unitCost`: Giá vốn đơn vị phục vụ tính toán chi phí.
  * `status`: Trạng thái nguyên liệu (`ACTIVE` hoặc `INACTIVE`).
  * `isLowStock()`: Phương thức tiện ích tự động so sánh tồn kho với định mức tối thiểu.
* **`StockTransaction.java` (Bảng `stock_transactions`):**
  * Lưu vết toàn bộ lịch sử biến động kho.
  * `transactionType`: Loại giao dịch (`INITIAL` - Tồn đầu kỳ, `STOCK_IN` - Nhập hàng, `USAGE` - Xuất pha chế).
  * `quantity`: Số lượng giao dịch.
  * `createdBy`: Khóa ngoại liên kết tới người dùng (`User`) thực hiện thao tác.
  * `createdAt`: Thời điểm thực hiện giao dịch.

### 4.2. Tầng Truy Vấn (InventoryItemRepository.java)
* **`findLowStock(String status)`**:
  * Sử dụng truy vấn JPQL:
    `@Query("SELECT i FROM InventoryItem i WHERE i.status = :status AND i.currentQuantity <= i.minimumStockLevel ORDER BY i.itemName")`
  * *Điểm kỹ thuật:* Đẩy việc so sánh 2 cột xuống tầng Database, giúp lọc trực tiếp từ SQL và tối ưu tốc độ.
* **`countLowStock(String status)`**: Đếm số lượng nguyên liệu sắp hết để phục vụ hiển thị Widget trên Dashboard.
* **`existsByItemNameIgnoreCase(String itemName)`**: Kiểm tra tính duy nhất của tên nguyên liệu, tránh tạo trùng lặp.

### 4.3. Tầng Xử Lý Nghiệp Vụ (InventoryService.java)
* **`stats()`**: Tổng hợp nhanh 3 chỉ số cho Manager: `total` (Tổng số mặt hàng), `lowStock` (Số mặt hàng báo động), `ok` (Số mặt hàng an toàn).
* **`listActive()` & `listLowStock()`**: Lấy danh sách nguyên liệu và convert sang `InventoryItemView` (DTO) trước khi trả về Controller.
* **`create(InventoryItemRequest req, User currentUser)`**:
  * Validate tên không được trùng lặp.
  * Lưu nguyên liệu mới.
  * Nếu có nhập số dư ban đầu (`openingQuantity > 0`), tự động sinh 1 giao dịch loại `INITIAL` gắn với nhân viên đăng nhập.
* **`update(Long id, InventoryItemRequest req)`**:
  * Cập nhật tên, đơn vị tính, định mức tối thiểu, đơn giá.
  * **Quy tắc nghiệp vụ cốt lõi:** *Hàm này cố tình KHÔNG cho phép sửa trường `currentQuantity`*. Số lượng tồn kho chỉ được phép thay đổi thông qua phiếu Nhập kho hoặc Xuất kho để chống gian lận dữ liệu.
* **`stockIn(Long id, StockInRequest req, User currentUser)`**:
  * Bọc trong `@Transactional` để đảm bảo toàn vẹn dữ liệu.
  * Tạo bản ghi `StockTransaction` loại `STOCK_IN` kèm ghi chú nhà cung cấp.
  * Cộng dồn số lượng: `item.currentQuantity += req.quantity`.

### 4.4. Tầng Giao Tiếp (Controllers)
* **`ManagerInventoryController.java`**: Gắn nhãn `@RequireRole("MANAGER")` tại cấp độ class. Bảo vệ toàn bộ endpoint `/api/manager/inventory/**`, chỉ cấp quyền cho tài khoản Quản lý.
* **`BaristaController.java`**: Gắn nhãn `@RequireRole("BARISTA")`. Cung cấp endpoint `GET /api/barista/inventory` hoàn toàn **Read-only** để nhân viên pha chế xem thông tin mà không thể sửa/xóa.

### 4.5. Tầng Giao Diện (Frontend ReactJS)
* **`inventoryApi.js`**: Module giao tiếp API bằng Axios, hỗ trợ tự động đính kèm thông tin xác thực.
* **`ManagerLayout.jsx`**: Layout chuẩn dành cho Manager với thanh Sidebar cố định, menu điều hướng chuyên nghiệp.
* **`ManagerOverview.jsx`**: Dashboard tổng quan với 3 Card KPI trực quan và Bảng cảnh báo nóng các nguyên liệu thiếu hụt.
* **`InventoryList.jsx`**: Trang danh sách nguyên liệu với tính năng tìm kiếm realtime, tab lọc trạng thái, bảng dữ liệu phân cấp rõ ràng.
* **`InventoryItemModal.jsx`**: Popup form Thêm/Sửa nguyên liệu với đầy đủ thông báo lỗi validation.
* **`StockInModal.jsx`**: Popup nhập kho trực quan hiển thị phép tính cộng dồn số lượng trước khi xác nhận.
* **`BaristaInventory.jsx`**: Màn hình tinh gọn, tối ưu cho máy tính bảng/màn hình cảm ứng tại quầy Barista.

---

## 5. KỊCH BẢN THUYẾT TRÌNH DEMO TRƯỚC GIẢNG VIÊN (LIVE DEMO SCRIPT)

### Bước 1: Giới thiệu mục tiêu & Phạm vi (45 giây)
> *"Kính thưa Thầy/Cô và Hội đồng, trong đợt Iteration 1 này, em đảm nhiệm thiết kế và hiện thực phân hệ **Quản lý Kho nguyên liệu** cho Quản lý (Manager) và màn hình **Tra cứu tồn kho** cho Pha chế (Barista). Mục tiêu trọng tâm của phân hệ là kiểm soát nguồn cung ứng nguyên liệu pha chế, cảnh báo thiếu hàng kịp thời để không làm gián đoạn việc bán hàng, đồng thời lưu vết lịch sử nhập kho rõ ràng để chống thất thoát."*

### Bước 2: Demo trang Tổng quan Dashboard (Manager Overview) (45 giây)
1. Đăng nhập bằng tài khoản **Manager**.
2. Trỏ vào trang **Tổng quan Quản lý**:
   > *"Tại trang Dashboard của Manager, hệ thống cung cấp ngay 3 chỉ số KPI: Tổng số loại nguyên liệu đang có, số mặt hàng sắp hết và số mặt hàng an toàn. Phía dưới là danh sách những nguyên liệu chạm ngưỡng báo động để người quản lý biết ngay mặt hàng nào cần ưu tiên nhập hàng hôm nay."*

### Bước 3: Demo CRUD Nguyên liệu & Nhập kho (1 phút 30 giây)
1. Chuyển sang menu **Kho nguyên liệu**:
   > *"Tại bảng danh sách, em có thể tìm kiếm nhanh nguyên liệu theo tên, hoặc dùng tab 'Cảnh báo sắp hết' để lọc ngay các món đang thiếu."*
2. Bấm nút **+ Thêm nguyên liệu**:
   > *"Em tạo mới một nguyên liệu ví dụ: 'Trà Oolong Túi Lọc', đơn vị 'gói', định mức tồn an toàn là 20 gói, tồn ban đầu là 15 gói. Vì tồn ban đầu (15) nhỏ hơn định mức an toàn (20), hệ thống ngay lập tức gắn huy hiệu màu đỏ 'Sắp hết hàng'."*
3. Bấm nút **Sửa**:
   > *"Khi chỉnh sửa, hệ thống cho phép đổi tên, quy cách, đơn giá nhưng cố tình KHÔNG cho phép sửa số lượng tồn thực tế tại đây."*
4. Bấm nút **Nhập kho**:
   > *"Để tăng tồn kho, người quản lý bắt buộc phải vào chức năng Nhập kho. Modal nhập kho hiển thị rõ ràng: Tồn hiện tại 15 + Nhập thêm 30 = Tồn mới 45. Em nhập ghi chú 'Nhập từ Đại lý Phúc Long' rồi bấm Lưu. Ngay lập tức, số tồn nhảy lên 45 và trạng thái tự động chuyển sang màu xanh 'Đủ dùng'."*

### Bước 4: Demo màn hình Barista Xem kho (45 giây)
1. Chuyển sang tài khoản **Barista**:
   > *"Tại quầy pha chế, Barista có thể mở tab Xem Kho. Đây là giao diện Read-only hoàn toàn, hiển thị trực quan các nguyên liệu. Nếu thấy nguyên liệu nào báo đỏ, Barista sẽ chủ động báo nhân viên phục vụ tắt món trên menu hoặc báo Quản lý nhập thêm."*

---

## 6. BỘ CÂU HỎI PHẢN BIỆN THƯỜNG GẶP & CÁCH TRẢ LỜI (Q&A DEFENSE)

### Câu hỏi 1: Tại sao trong hàm cập nhật nguyên liệu (update), em không cho phép sửa trường currentQuantity?
* **Trả lời:** *"Dạ thưa Thầy/Cô, trong nguyên lý quản trị kho chuyên nghiệp (Inventory Control), số lượng tồn thực tế không được phép sửa tùy tiện bằng form edit thông thường. Mọi biến động tăng/giảm số lượng bắt buộc phải gắn liền với một giao dịch cụ thể (như phiếu Nhập kho, phiếu Xuất pha chế, hoặc phiếu Kiểm kê cân chỉnh). Thiết kế này giúp hệ thống luôn có nhật ký (Audit Trail) để đối soát, xác định rõ ai là người làm thay đổi số liệu và vào thời điểm nào, tránh tối đa việc thất thoát hoặc gian lận nội bộ."*

### Câu hỏi 2: Em xử lý logic nhận biết nguyên liệu 'Sắp hết' (Low-stock) như thế nào ở cả tầng Backend và Database?
* **Trả lời:** *"Dạ, mỗi nguyên liệu có một thuộc tính định mức an toàn là `minimumStockLevel`. Ở tầng Entity em có helper method `isLowStock()` để kiểm tra nhanh. Còn tại tầng Database, em viết custom JPQL query trong `InventoryItemRepository` để so sánh trực tiếp `i.currentQuantity <= i.minimumStockLevel`. Việc này giúp database thực hiện lọc và phân trang ngay tại nguồn, tránh việc phải tải hàng nghìn bản ghi lên bộ nhớ RAM rồi mới lọc thủ công bằng Java stream, giúp tối ưu hiệu năng."*

### Câu hỏi 3: Làm sao em đảm bảo tài khoản Barista không gọi lén được các API Thêm/Sửa/Nhập kho của Manager?
* **Trả lời:** *"Dạ, hệ thống áp dụng cơ chế Role-Based Access Control (RBAC). Toàn bộ `ManagerInventoryController` được bảo vệ bởi annotation `@RequireRole(\"MANAGER\")`. Khi có request gửi lên, `AuthInterceptor` sẽ giải mã phiên đăng nhập và kiểm tra role của người dùng. Nếu Barista gửi request đến endpoint của Manager, interceptor sẽ chặn ngay lập tức và trả về mã lỗi HTTP 403 Forbidden."*

### Câu hỏi 4: Trong Iteration tiếp theo (Iteration 2), phân hệ kho này sẽ liên kết với các module khác như thế nào?
* **Trả lời:** *"Dạ thưa Thầy/Cô, trong Iteration 2, phân hệ kho sẽ được liên kết trực tiếp với 2 chức năng: (1) Bảng công thức pha chế (Recipe Management) – khi Barista bấm 'Hoàn thành' đơn hàng, hệ thống sẽ tự động trừ hao nguyên liệu tương ứng trong kho (Auto Stock-Out); và (2) Cảnh báo tự động ngưng phục vụ món trên Menu khi nguyên liệu chính trong kho đã cạn kiệt."*
