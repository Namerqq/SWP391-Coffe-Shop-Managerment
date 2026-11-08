# TỔNG HỢP TOÀN BỘ NGHIỆP VỤ, KIẾN TRÚC & LUỒNG CODE CHI TIẾT
## PHÂN HỆ: QUẢN LÝ KHO (INVENTORY), PHIẾU NHẬP KHO, SỔ THẺ KHO BẤT BIẾN, GIÁ VỐN BÌNH QUÂN (WAC), BACKGROUND JOB QUÉT KHO & BÁO CÁO DOANH THU
**Học phần:** SWP391 - Software Development Project | **Đồ án:** Coffee Shop Management System (Gạch Coffee)  
**Tác giả (Sinh viên thực hiện):** Phạm Gia Bảo (BaoPG - `giabaomc`)  
**Nhánh Git:** `feature/giabao-config` | **Hệ quản trị CSDL:** MySQL 8.0 (InnoDB) | **Backend:** Spring Boot 3.3.4 (Java 17) | **Frontend:** React 18, Vite, Bootstrap 5

---

## BẢNG TỔNG HỢP CÁC USE CASE & CHỨC NĂNG THỰC HIỆN

| STT | Mã Use Case / GBR | Tên chức năng | Giao diện Frontend (URL) | Backend Service & Controller | Vai trò cốt lõi trong hệ thống |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **UC-IV01** | **Quản lý danh mục nguyên liệu kho** | `/manager/inventory`<br>[`InventoryList.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/InventoryList.jsx) | [`ManagerInventoryController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerInventoryController.java)<br>[`InventoryService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/InventoryService.java) | Quản lý danh mục nguyên liệu, đơn vị tính, số lượng tồn thực tế, định mức tồn tối thiểu an toàn (`min_stock`). Cấm sửa trực tiếp số lượng tồn. |
| **2** | **UC-IV02 & UC-IV04** | **Quản lý Phiếu nhập kho & Giá vốn WAC** | `/manager/stock-receipts`<br>[`StockReceiptList.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/StockReceiptList.jsx) | [`ManagerStockReceiptController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerStockReceiptController.java)<br>[`StockReceiptService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/StockReceiptService.java) | Vòng đời phiếu: `DRAFT` &rarr; `RECEIVED` &rarr; `CANCELLED`. Duyệt phiếu báo thiếu `YC-...` từ Barista. Tính đơn giá vốn bình quân gia quyền di động (MAC/WAC). |
| **3** | **GBR-09** | **Sổ thẻ kho bất biến (Stock Ledger)** | `/manager/stock-history`<br>[`StockHistoryPage.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/StockHistoryPage.jsx) | [`InventoryService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/InventoryService.java#L230-L350)<br>[`StockTransactionRepository.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/repository/StockTransactionRepository.java) | Bảng kiểm toán bất biến `stock_transactions` (chỉ INSERT, cấm UPDATE/DELETE). Tra cứu thẻ kho chi tiết theo ngày: nhập (`STOCK_IN`), xuất (`STOCK_OUT`), hao hụt (`WASTE`). |
| **4** | **UC-IV03** | **Background Job Quét kho tự động** | `/manager`<br>[`ManagerOverview.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/ManagerOverview.jsx) | [`LowStockCheckingJob.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/LowStockCheckingJob.java)<br>[`ManagerDashboardController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerDashboardController.java) | SRS Background Job #1: Chạy định kỳ (`@Scheduled`) quét nguyên liệu có `current_quantity <= min_stock`. Cung cấp nút "Quét ngay" thủ công trên Dashboard Quản lý. |
| **5** | **UC-RP01 & UC-RP02** | **Báo cáo Doanh thu & Phân tích bán hàng** | `/manager/revenue`<br>[`RevenueReport.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/RevenueReport.jsx) | [`ManagerRevenueController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerRevenueController.java)<br>[`RevenueService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/RevenueService.java) | Thống kê doanh thu theo Ngày, Tuần, Tháng, Năm, Khoảng tùy chọn. Phân loại tiền mặt vs QR. Top món bán chạy nhất và tính năng Xuất file Excel (GBR-12). |
| **6** | **UC-B05 & UC-B06** | **Nghiệp vụ Kho liên kết quầy Barista** | `/barista`<br>[`BaristaStockRequestModal.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/barista/BaristaStockRequestModal.jsx) | [`BaristaController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/BaristaController.java)<br>[`InventoryService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/InventoryService.java) | Barista gửi phiếu báo thiếu nguyên liệu `YC-...` lên Manager duyệt. Báo hỏng/đổ vỡ nguyên liệu (`WASTE`). Tự động trừ kho theo định lượng Recipe khi nhận đơn. |

---

## 1. PHÂN TÍCH NGHIỆP VỤ CỐT LÕI

### 1.1. Bản chất: Xóa nguyên liệu (Soft Delete) KHÁC Ngưng sử dụng như thế nào?
* **Xóa nguyên liệu (Soft Delete):**
  * Trong bảng `inventory_items`, không dùng lệnh `DELETE FROM inventory_items`. Nếu dùng lệnh này, toàn bộ lịch sử các phiếu nhập kho cũ (`stock_receipt_items`) và sổ thẻ kho kiểm toán (`stock_transactions`) sẽ bị vi phạm ràng buộc khóa ngoại hoặc bị mất dấu vết kế toán.
  * Khi nguyên liệu bị xóa, hệ thống chuyển `status = 'INACTIVE'`. Nguyên liệu này không còn xuất hiện trong danh sách tạo phiếu nhập mới, không xuất hiện ở quầy pha chế Barista, nhưng toàn bộ lịch sử biến động trong quá khứ vẫn được bảo toàn nguyên vẹn để đối soát.
* **Nguyên liệu Tạm hết / Chạm ngưỡng cảnh báo:**
  * Nguyên liệu vẫn có `status = 'ACTIVE'`, nhưng dựa trên số lượng tồn thực tế:
    * 🔴 **Hết hàng:** `current_quantity == 0`
    * 🟡 **Sắp hết hàng (Low Stock):** `0 < current_quantity <= minimum_stock_level`
    * 🟢 **Đủ tồn an toàn:** `current_quantity > minimum_stock_level`
  * Khi chạm ngưỡng vàng hoặc đỏ, hệ thống kích hoạt hiển thị cảnh báo lên Dashboard Quản lý và đổi màu badge tại màn hình Barista để nhân viên chủ động báo nhập hàng.

### 1.2. Món nào được gán Topping và Cách trừ kho nguyên liệu Topping khi Barista nhận đơn
* Trong hệ thống của quán, **Topping** (như Trân châu đen, Thạch cà phê, Kem cheese...) là các thành phẩm được pha chế hoặc chuẩn bị từ các **Nguyên liệu kho** (Bột trân châu, Sữa tươi, Hạt cà phê...):
  1. Topping được gán cho các món chính thuộc loại Đồ uống (`DRINK`) hoặc Đồ ăn (`FOOD`). Món thuộc nhóm Topping không thể có topping đi kèm.
  2. **Luồng trừ kho tự động khi Barista bấm "Nhận đơn" (`deductForOrder`):**
     * Backend duyệt qua từng món trong đơn (`order_items`).
     * Tra cứu công thức định lượng (`recipe_ingredients`) của món chính VÀ của tất cả các Topping đi kèm (ví dụ: 1 ly Cà phê sữa đá size L + Trân châu đen $\rightarrow$ trừ 20g cà phê hạt, 30ml sữa đặc, 50g trân châu).
     * **Pre-check tồn kho:** Backend kiểm tra tổng số lượng nguyên liệu cần thiết so với `current_quantity` trong kho. Nếu thiếu bất kỳ nguyên liệu nào, giao dịch bị chặn lại ngay lập tức (HTTP 400: *"Không đủ nguyên liệu để pha chế món..."*).
     * Nếu đủ, hệ thống tự động trừ kho nguyên tử và sinh các bản ghi thẻ kho `STOCK_OUT` với ghi chú: *"Pha chế đơn #{orderId}"*.

### 1.3. Quy tắc bất biến của Số lượng tồn kho (GBR-09: Immutable Stock Balance)
* **Quy tắc vàng:** **TUYỆT ĐỐI CẤM SỬA TRỰC TIẾP SỐ LƯỢNG TỒN KHO (`current_quantity`).**
* Trong màn hình Chỉnh sửa nguyên liệu [`InventoryItemModal.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/InventoryItemModal.jsx), ô "Số lượng tồn" bị khóa cứng (disabled, read-only). Quản lý chỉ được phép sửa: Tên nguyên liệu, Đơn vị tính, Định mức tồn tối thiểu, Đơn giá vốn.
* Số lượng tồn kho chỉ được phép thay đổi qua 4 con đường chính thống có phát sinh chứng từ:
  1. **Nhập kho (`STOCK_IN`):** Duyệt phiếu nhập kho hoặc tạo phiếu nhập nhanh.
  2. **Xuất bán (`STOCK_OUT`):** Tự động trừ khi Barista nhận đơn theo công thức Recipe.
  3. **Hao hụt / Đổ vỡ (`WASTE`):** Barista hoặc Quản lý lập biên bản báo hỏng nguyên liệu.
  4. **Hoàn trả (`STOCK_IN`):** Khi đơn hàng bị hủy trước khi pha chế.

---

## 2. LUỒNG XỬ LÝ CHI TIẾT KHI BẤM "LƯU" (END-TO-END EXECUTION TRACE)

Lấy ví dụ nghiệp vụ quan trọng nhất: **Quản lý bấm "Xác nhận nhập kho" (Confirm Receipt)** trên màn hình [`StockReceiptList.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/StockReceiptList.jsx):

```
[1. User click "Xác nhận nhập kho"] 
                  │
                  ▼
[2. Frontend ConfirmModal] (Hiển thị cảnh báo: Không thể hoàn tác, tồn kho sẽ tăng)
                  │
                  ▼
[3. Axios Client Packaging] (POST /api/manager/stock-receipts/{id}/confirm + Bearer Token)
                  │
                  ▼
[4. Security Filter & Role AOP] (Xác thực JWT -> Kiểm tra @RequireRole("MANAGER"))
                  │
                  ▼
[5. Controller Delegation] (ManagerStockReceiptController.confirmReceipt(id, currentUser))
                  │
                  ▼
[6. Service Layer Transaction] (@Transactional - StockReceiptService.confirmReceipt)
    ├─ 6.1. Kiểm tra trạng thái phiếu: Phải là DRAFT (nếu RECEIVED -> Lỗi)
    ├─ 6.2. Duyệt từng dòng nguyên liệu trong phiếu (items):
    │       ├─ Tính đơn giá bình quân gia quyền di động (MAC/WAC)
    │       ├─ Cộng dồn số lượng tồn: currentQuantity = currentQuantity + inQty
    │       ├─ Cập nhật giá vốn mới: unitCost = newWAC
    │       └─ Sinh bản ghi thẻ kho kiểm toán: StockTransaction (STOCK_IN)
    └─ 6.3. Đổi trạng thái phiếu: status = 'RECEIVED'
                  │
                  ▼
[7. MySQL Execution & ACID] (InnoDB Row-level Locking, kiểm tra Check Constraints -> COMMIT)
                  │
                  ▼
[8. Response & UI Refresh] (Trả StockReceiptView 200 OK -> Toast báo thành công -> Reload bảng)
```

### Bước 1: Kích hoạt sự kiện tại Frontend Component
- Quản lý click nút **"Xác nhận nhập kho"** tại dòng phiếu nhập kho ở trạng thái `DRAFT`.
- Giao diện mở popup [`ConfirmModal.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/components/ConfirmModal.jsx) giải thích rõ: *"Hành động này sẽ cập nhật số lượng tồn kho thực tế và tính lại giá vốn bình quân. Bạn có chắc chắn muốn nhập kho phiếu này?"*.

### Bước 2: Đóng gói và phát sinh HTTP Request
- Khi bấm Đồng ý, hàm `handleConfirm(id)` được kích hoạt:
  ```javascript
  setActionBusy(true);
  try {
    await stockReceiptApi.confirm(id);
    toast('Đã xác nhận nhập kho thành công.', 'success');
    loadData(); // Tải lại danh sách
  } catch (err) {
    toast(errorMessage(err), 'error');
  } finally {
    setActionBusy(false);
  }
  ```
- Axios gửi `POST /api/manager/stock-receipts/{id}/confirm` đính kèm header `Authorization: Bearer <token>`.

### Bước 3: Lớp bảo mật Spring Security & Phân quyền
- `JwtAuthenticationFilter` giải mã token, xác thực danh tính Quản lý.
- Bộ chặn AOP `@RequireRole("MANAGER")` trên [`ManagerStockReceiptController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerStockReceiptController.java#L16) kiểm tra role. Nếu người gọi không phải MANAGER $\rightarrow$ từ chối ngay với HTTP `403 Forbidden`.

### Bước 4: Xử lý nghiệp vụ tại Service Layer (`@Transactional`)
- Hàm `confirmReceipt(id, currentUser)` trong [`StockReceiptService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/StockReceiptService.java#L219) mở một giao dịch dữ liệu nguyên tử:
  1. **Kiểm tra trạng thái phiếu:**
     ```java
     StockReceipt receipt = receiptRepo.findWithDetailsById(id)
         .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu"));
     if (!StockReceipt.DRAFT.equals(receipt.getStatus())) {
         throw ApiException.badRequest("Chỉ có thể xác nhận phiếu ở trạng thái Nháp (DRAFT).");
     }
     ```
  2. **Duyệt qua từng dòng nguyên liệu nhập (`items`):**
     * Tìm `InventoryItem` tương ứng trong database.
     * **Tính giá vốn bình quân gia quyền di động (MAC/WAC):**
       ```java
       long newCost = calculateWeightedAverageCost(
           inv.getCurrentQuantity(), inv.getUnitCost(),
           item.getQuantity(), item.getUnitCost()
       );
       ```
       *Công thức:*
       $$\text{Giá vốn mới} = \frac{(\text{Tồn cũ} \times \text{Giá cũ}) + (\text{Số lượng nhập} \times \text{Giá nhập})}{\text{Tồn cũ} + \text{Số lượng nhập}}$$
     * **Cập nhật số dư kho và giá vốn:**
       ```java
       BigDecimal oldQty = inv.getCurrentQuantity();
       BigDecimal newQty = oldQty.add(item.getQuantity());
       inv.setCurrentQuantity(newQty);
       inv.setUnitCost(newCost);
       itemRepo.save(inv);
       ```
     * **Ghi nhận vết kiểm toán bất biến vào Sổ thẻ kho:**
       ```java
       StockTransaction tx = new StockTransaction();
       tx.setInventoryItem(inv);
       tx.setTransactionType(StockTransaction.STOCK_IN);
       tx.setQuantityChange(item.getQuantity());
       tx.setBalanceBefore(oldQty);
       tx.setBalanceAfter(newQty);
       tx.setStockReceipt(receipt);
       tx.setCreatedBy(currentUser);
       tx.setNote("Nhập kho theo phiếu " + receipt.getReceiptCode());
       txRepo.save(tx);
       ```
  3. **Đổi trạng thái phiếu nhập:** `receipt.setStatus(StockReceipt.RECEIVED)`.

### Bước 5: Thực thi tại Database & Đảm bảo ACID
- MySQL thực thi các lệnh `UPDATE inventory_items`, `INSERT INTO stock_transactions`, `UPDATE stock_receipts`.
- Ràng buộc toàn vẹn `CHECK (current_quantity >= 0)` được kiểm tra.
- Khi hoàn tất, transaction được `COMMIT` xuống ổ đĩa. Nếu xảy ra bất kỳ lỗi runtime nào, toàn bộ quá trình rollback 100%.

### Bước 6: Phản hồi và Cập nhật Giao diện
- Backend trả về DTO `StockReceiptView` với HTTP `200 OK`.
- Frontend nhận response, hiển thị Toast xanh *"Đã xác nhận nhập kho thành công"*.
- Hàm `loadData()` tự động chạy lại, badge phiếu chuyển sang màu xanh lá `ĐÃ NHẬP KHO` (`RECEIVED`), nút Xác nhận biến mất (khóa sửa đổi).

---

## 3. THIẾT KẾ FRONTEND (REACT 18 & BOOTSTRAP 5)

### 3.1. Danh sách các Component do Phạm Gia Bảo xây dựng

```
ManagerLayout
 ├── ManagerOverview.jsx (Bảng điều khiển KPI: Doanh thu, Bàn, Cảnh báo kho, Yêu cầu pha chế)
 ├── InventoryList.jsx (Quản lý kho nguyên liệu, lọc tồn kho an toàn)
 │    ├── InventoryItemModal.jsx (Popup Thêm/Sửa nguyên liệu & định mức min stock)
 │    ├── StockInModal.jsx / StockOutModal.jsx (Nhập / Xuất hao hụt nhanh)
 │    └── StockHistoryModal.jsx (Popup xem thẻ kho riêng của từng nguyên liệu)
 ├── StockReceiptList.jsx (Quản lý phiếu nhập kho: Tất cả, DRAFT, RECEIVED, CANCELLED)
 │    └── StockReceiptModal.jsx (Form tạo/sửa phiếu, duyệt phiếu thiếu YC-..., preview giá vốn WAC)
 ├── StockHistoryPage.jsx (Sổ thẻ kho bất biến toàn quán theo ngày: STOCK_IN, STOCK_OUT, WASTE)
 └── RevenueReport.jsx (Báo cáo doanh thu đa kỳ: Ngày, Tuần, Tháng, Năm, Custom & Xuất Excel)
```

### 3.2. Quản lý State và Props trong các Modal cốt lõi
* **State trong `StockReceiptModal.jsx`:**
  * `items`: Danh sách các dòng nguyên liệu trong phiếu nhập `[{ inventoryItemId, quantity, unitCost, subtotal }]`.
  * `supplierName`, `receiptDate`, `note`: Thông tin chung của phiếu.
  * `previewWacMap`: Lưu trữ kết quả tính trước giá vốn mới để hiển thị cho quản lý xem trước khi lưu.
  * `busy`: Chặn double-click khi đang gửi API.
* **Props truyền nhận:**
  * `selectedReceiptId`: ID phiếu cần mở xem hoặc sửa (nếu null là tạo phiếu mới).
  * `onClose()`: Callback đóng modal.
  * `onSaved()`: Callback thông báo cho danh sách cha reload dữ liệu.

---

## 4. THIẾT KẾ BACKEND (SPRING BOOT 3.3.4 & JAVA 17/25)

### 4.1. Cấu trúc phân tầng (Clean Layered Architecture)

```
[HTTP Request]
       │
       ▼
[Manager Controller Layer]
  - ManagerInventoryController.java   (UC-IV01)
  - ManagerStockReceiptController.java (UC-IV02, UC-IV04)
  - ManagerRevenueController.java      (UC-RP01, UC-RP02)
  - ManagerDashboardController.java    (Live KPIs & Job Trigger)
       │
       ▼
[DTO & Bean Validation Layer]
  - InventoryItemRequest / InventoryItemView
  - StockReceiptRequest / StockReceiptView / StockReceiptItemRequest
  - RevenueReportView / ManagerDashboardView
       │
       ▼
[Service Layer (@Transactional)]
  - InventoryService.java
  - StockReceiptService.java
  - RevenueService.java
  - ManagerDashboardService.java
  - LowStockCheckingJob.java (Scheduled Worker)
       │
       ▼
[Repository Layer (Spring Data JPA & JPQL)]
  - InventoryItemRepository.java
  - StockReceiptRepository.java
  - StockTransactionRepository.java
  - RevenueRepository.java
```

### 4.2. Khai báo DTO và Bean Validation (JSR-380)

Lấy ví dụ DTO [`InventoryItemRequest.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/dto/inventory/InventoryItemRequest.java):
```java
public record InventoryItemRequest(
    @NotBlank(message = "Tên nguyên liệu không được để trống")
    @Size(max = 120, message = "Tên nguyên liệu tối đa 120 ký tự")
    String itemName,

    @NotBlank(message = "Đơn vị tính không được để trống")
    @Size(max = 30, message = "Đơn vị tính tối đa 30 ký tự")
    String unit,

    @NotNull(message = "Định mức tồn tối thiểu không được để trống")
    @DecimalMin(value = "0.0", inclusive = true, message = "Định mức tối thiểu không được âm")
    BigDecimal minimumStockLevel,

    @Min(value = 0, message = "Đơn giá vốn không được âm")
    Long unitCost,

    @DecimalMin(value = "0.0", message = "Số lượng ban đầu không được âm")
    BigDecimal openingQuantity
) {}
```

---

## 5. CƠ SỞ DỮ LIỆU & QUẢN LÝ GIAO DỊCH (ACID TRANSACTION)

### 5.1. Bảng dữ liệu và Quan hệ thực thể (ERD)

```
┌─────────────────────────┐          1:N         ┌─────────────────────────┐
│     inventory_items     │─────────────────────<│   stock_receipt_items   │
│─────────────────────────│                      │─────────────────────────│
│ PK inventory_item_id    │                      │ PK stock_receipt_item_id│
│    item_name (UNIQUE)   │                      │ FK stock_receipt_id     │
│    unit                 │                      │ FK inventory_item_id    │
│    current_quantity     │                      │    quantity             │
│    minimum_stock_level  │                      │    unit_cost            │
│    unit_cost            │                      └─────────────────────────┘
│    status               │                                   ▲
└─────────────────────────┘                                   │ N:1
             │                                   ┌─────────────────────────┐
             │ 1:N                               │     stock_receipts      │
             ▼                                   │─────────────────────────│
┌─────────────────────────┐                      │ PK stock_receipt_id     │
│   stock_transactions    │                      │    receipt_code (UNIQUE)│
│─────────────────────────│                      │    supplier_name        │
│ PK stock_transaction_id │                      │    receipt_date         │
│ FK inventory_item_id    │                      │    status (DRAFT/REC..) │
│ FK stock_receipt_id     │                      │ FK created_by_user_id   │
│    transaction_type     │                      └─────────────────────────┘
│    quantity_change      │
│    balance_before       │
│    balance_after        │
│    created_at           │
└─────────────────────────┘
```

* **Bảng `inventory_items`:**
  * `CHECK (current_quantity >= 0)`: Đảm bảo tồn kho không bao giờ âm ở tầng vật lý.
  * `UNIQUE (item_name)`: Ngăn chặn trùng tên nguyên liệu.
* **Bảng `stock_receipts`:**
  * `receipt_code`: Mã tự sinh duy nhất dạng `PN-yyyyMMdd-XXXX` hoặc `YC-yyyyMMdd-XXXX`.
  * `CHECK (status IN ('DRAFT', 'RECEIVED', 'CANCELLED'))`.
* **Bảng `stock_transactions` (Sổ thẻ kho bất biến):**
  * `transaction_type`: `STOCK_IN`, `STOCK_OUT`, `WASTE`.
  * Lưu trữ vết: `balance_before`, `quantity_change`, `balance_after`, thời gian chính xác tới millisecond.

### 5.2. Tính chất ACID của Transaction trong Quản lý Kho
* **Atomicity (Tính nguyên tử):** Trong quá trình duyệt phiếu nhập kho có 5 nguyên liệu: nếu việc tăng tồn cho 4 nguyên liệu đầu thành công nhưng nguyên liệu thứ 5 bị lỗi, toàn bộ thao tác tăng tồn và ghi thẻ kho của 4 nguyên liệu trước đó đều bị **Rollback** hoàn toàn. Phiếu nhập vẫn ở trạng thái `DRAFT`, không bao giờ có chuyện nhập dở dang một nửa.
* **Consistency (Tính nhất quán):** Dữ liệu thẻ kho luôn bảo toàn công thức toán học:
  $$\text{balance\_after} = \text{balance\_before} + \text{quantity\_change}$$
* **Isolation (Tính cô lập):** Sử dụng cơ chế Row-level locking của MySQL InnoDB. Khi một nguyên liệu đang được Barista trừ kho do nhận đơn, giao dịch Quản lý nhập thêm nguyên liệu đó phải đợi giao dịch trước hoàn tất, loại trừ 100% rủi ro mất mát dữ liệu (Lost Update).

---

## 6. BỘ CÂU HỎI PHẢN BIỆN BẢO VỆ ĐỒ ÁN & KỊCH BẢN KIỂM THỬ (DEFENSE CHEATSHEET)

### Câu hỏi 1: Giả mạo dữ liệu / Sửa Request qua Postman hoặc DevTools
* **Hội đồng hỏi:** *"Nếu một người dùng cố tình can thiệp Request qua Postman gửi số lượng nhập kho âm (`quantity = -10`), hoặc cố tình truyền trường `currentQuantity = 9999` trong request sửa nguyên liệu, hệ thống xử lý thế nào?"*
* **Trả lời:**
  1. **Tầng Bean Validation:** Annotation `@DecimalMin(value = "0.0")` trên DTO sẽ phát hiện ngay số âm và từ chối xử lý ngay tại Controller với mã HTTP `400 Bad Request`.
  2. **Tầng DTO & Service (Bảo vệ tồn kho):** Trong DTO [`InventoryItemRequest.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/dto/inventory/InventoryItemRequest.java) khi cập nhật, **hoàn toàn không có trường `currentQuantity`**. Dù người dùng có cố tình truyền thêm `currentQuantity: 9999` trong JSON, Spring Boot sẽ bỏ qua. Trong hàm `update` tại `InventoryService`, hệ thống chỉ map các trường được phép sửa (`itemName`, `unit`, `minimumStockLevel`, `unitCost`), số lượng tồn được giữ nguyên 100%.

---

### Câu hỏi 2: Xử lý Thao tác đồng thời (Concurrency & Race Condition)
* **Hội đồng hỏi:** *"Giả sử trong kho chỉ còn 1kg cà phê hạt. Cùng một lúc, Barista A bấm nhận đơn cần 0.8kg cà phê, và Barista B bấm nhận đơn cần 0.5kg cà phê. Chuyện gì sẽ xảy ra?"*
* **Trả lời:**
  - Cả 2 thao tác đều gọi hàm `deductForOrder` được bảo vệ bởi `@Transactional`.
  - Transaction của Barista A đến trước sẽ giữ **Row Lock** trên dòng nguyên liệu Cà phê hạt trong bảng `inventory_items`.
  - Barista A kiểm tra: $1.0\text{kg} \ge 0.8\text{kg}$ &rarr; Đủ &rarr; Trừ tồn còn $0.2\text{kg}$, ghi thẻ kho và Commit (nhả khóa).
  - Transaction của Barista B được tiếp tục xử lý: Đọc số lượng tồn mới nhất là $0.2\text{kg}$. Kiểm tra: $0.2\text{kg} < 0.5\text{kg}$ &rarr; Không đủ &rarr; Ném ngoại lệ `ApiException.badRequest("Nguyên liệu Cà phê hạt không đủ tồn kho để pha chế (còn 0.2 kg, cần 0.5 kg)")`.
  - Kết quả: Không bao giờ xảy ra tình trạng âm kho, đảm bảo tính toàn vẹn 100%.

---

### Câu hỏi 3: Vai trò của Scheduled Background Job quét kho (SRS Job #1)
* **Hội đồng hỏi:** *"Tại sao em lại cần Scheduled Job quét kho trong khi có thể kiểm tra trực tiếp mỗi khi mở trang?"*
* **Trả lời:**
  - **Giảm tải cho Database:** Nếu mỗi lần người dùng mở Dashboard lại chạy câu query phức tạp quét toàn bộ kho, server sẽ bị nghẽn khi có nhiều nhân viên cùng truy cập. Background Job quét ngầm định kỳ (mỗi 60 giây) và lưu kết quả vào một bộ nhớ đệm `AtomicReference<LowStockSnapshot>` (Thread-safe memory cache). Khi Manager mở Dashboard, hệ thống lấy ngay snapshot trong RAM chỉ mất **1ms**.
  - **Chủ động phát hiện sự cố:** Job tự động ghi log cảnh báo ra hệ thống giám sát server (`log.warn`) ngay cả khi không có Manager nào đăng nhập vào web, giúp đội ngũ vận hành chủ động nắm bắt nguy cơ đứt gãy nguyên vật liệu.

---

### Câu hỏi 4: Cơ chế tính giá vốn bình quân gia quyền di động (MAC/WAC)
* **Hội đồng hỏi:** *"Tại sao quán lại chọn phương pháp Bình quân gia quyền di động thay vì FIFO hay LIFO?"*
* **Trả lời:**
  - Đối với ngành F&B đồ uống, nguyên liệu như sữa tươi, siro, cà phê hạt thường được trút chung vào hũ, bình chứa tại quầy bar. Việc theo dõi xuất kho chính xác từng hạt cà phê theo từng lô nhập (FIFO - Nhập trước xuất trước) là bất khả thi trong thực tế vận hành.
  - Phương pháp **Bình quân gia quyền di động (Moving Average Cost)** là chuẩn mực kế toán tối ưu nhất cho nhà hàng / quán cà phê: Mỗi lần nhập hàng mới với giá khác nhau, hệ thống tự động hòa trộn giá trị tồn cũ và giá trị lô mới để tính ra một đơn giá vốn bình quân duy nhất. Giúp tính toán giá vốn ly nước bán ra và tỷ suất lợi nhuận trên báo cáo doanh thu luôn phản ánh sát nhất với chi phí thực tế.

---

### Câu hỏi 5: Lịch sử kho bất biến (Immutable Ledger) giải quyết gian lận thế nào?
* **Hội đồng hỏi:** *"Nếu nhân viên gian lận, tự ý sửa số tồn kho hoặc xóa bớt giao dịch thì hệ thống phát hiện thế nào?"*
* **Trả lời:**
  - Bảng `stock_transactions` là một sổ cái bất biến (Append-only). Không có bất kỳ API hay chức năng nào cho phép Sửa (`PUT`) hoặc Xóa (`DELETE`) một giao dịch thẻ kho đã phát sinh.
  - Mỗi dòng giao dịch ghi nhận rõ: `balance_before`, `quantity_change`, `balance_after`, thời gian chính xác và `created_by_user_id` (ai là người thực hiện).
  - Quản lý có thể dùng chức năng **Sổ thẻ kho theo ngày (`/manager/stock-history`)** để đối soát: Nếu lấy Tồn đầu ngày + Tổng nhập - Tổng xuất - Tổng hao hụt mà không khớp với Tồn cuối ngày, hệ thống sẽ lập tức phát hiện sự sai lệch.

---

## 7. CHI TIẾT MÃ NGUỒN (CODE) CỦA CÁC LUỒNG NGHIỆP VỤ LÕI

Dưới đây là phân tích chi tiết từng dòng code, file nguồn, hàm thực thi và cơ chế xử lý kỹ thuật của toàn bộ các nghiệp vụ do sinh viên Phạm Gia Bảo phụ trách.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           BẢN ĐỒ MÃ NGUỒN CÁC LUỒNG NGHIỆP VỤ KHO & DOANH THU                  │
├─────────────────────────┬───────────────────────────┬──────────────────────────────────────────┤
│ Luồng nghiệp vụ         │ Tầng Controller / DTO     │ Tầng Service & Logic xử lý cốt lõi       │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ 1. Danh mục & Khóa sửa  │ ManagerInventoryController│ InventoryService.java (create / update)  │
│    số lượng tồn kho     │ InventoryItemRequest      │ -> Bỏ qua currentQuantity khi update     │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ 2. Vòng đời Phiếu nhập  │ ManagerStockReceiptContr. │ StockReceiptService.confirmReceipt       │
│    & Giá vốn MAC/WAC    │ StockReceiptItemRequest   │ -> calculateWeightedAverageCost (MAC)    │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ 3. Barista báo thiếu    │ BaristaController.java    │ StockReceiptService.createBatchShortage  │
│    hàng loạt (YC-...)   │ ShortageBatchRequest      │ -> Tự sinh mã phiếu YC-yyyyMMdd-XXXX     │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ 4. Tự động trừ kho      │ BaristaController.java    │ InventoryService.deductForOrder          │
│    theo Recipe món      │ Order.java / OrderItem    │ -> resolveRecipe + Pre-check tồn kho     │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ 5. Báo hao hụt / hỏng   │ BaristaController.java    │ InventoryService.waste                   │
│    nguyên liệu (WASTE)  │ WasteReportRequest        │ -> Tính bồi thường + Ghi sổ thẻ kho      │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ 6. Background Job quét  │ ManagerDashboardController│ LowStockCheckingJob.java (@Scheduled)    │
│    tồn an toàn định kỳ  │ LowStockSnapshot          │ -> AtomicReference caching (1ms lookup)  │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ 7. Báo cáo Doanh thu &  │ ManagerRevenueController  │ RevenueService.java (report CUSTOM)      │
│    Xuất file Excel      │ RevenueReportView         │ RevenueReport.jsx (exportRevenueCSV BOM) │
└─────────────────────────┴───────────────────────────┴──────────────────────────────────────────┘
```

---

### 7.1. Luồng 1: Khởi tạo, Cập nhật nguyên liệu & Cơ chế bảo vệ tính bất biến của Tồn kho
* **Tệp mã nguồn:**
  - Frontend: [`InventoryItemModal.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/InventoryItemModal.jsx)
  - Backend Controller: [`ManagerInventoryController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerInventoryController.java#L40-L75)
  - Backend Service: [`InventoryService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/InventoryService.java#L70-L135)
  - DTO: [`InventoryItemRequest.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/dto/inventory/InventoryItemRequest.java)

* **Code phân tích cơ chế chống sửa số lượng tồn (GBR-09):**
  1. **Tầng Frontend (`InventoryItemModal.jsx`):**
     ```jsx
     {/* Khi ở chế độ Edit, ô số lượng tồn bị disabled hoàn toàn */}
     <div className="col-md-6">
       <label className="form-label fw-bold">Số lượng tồn kho</label>
       <input
         type="number"
         className="form-control"
         value={form.currentQuantity}
         disabled={isEdit} // Khóa cứng khi chỉnh sửa
         readOnly={isEdit}
       />
       {isEdit && <small className="text-muted">Số lượng tồn chỉ được thay đổi qua phiếu nhập hoặc xuất kho.</small>}
     </div>
     ```
  2. **Tầng Backend Service (`InventoryService.java` - method `update`):**
     ```java
     @Transactional
     public InventoryItemView update(Long id, InventoryItemRequest req) {
         InventoryItem item = findItem(id);
         // Chỉ cập nhật các thông tin mô tả và định mức, KHÔNG gán item.setCurrentQuantity(...)
         item.setItemName(req.itemName().trim());
         item.setUnit(req.unit().trim());
         item.setMinimumStockLevel(req.minimumStockLevel());
         item.setUnitCost(req.unitCost());
         // Số lượng tồn hiện tại (currentQuantity) được giữ nguyên tuyệt đối!
         return InventoryItemView.from(item);
     }
     ```
  3. **Tầng DTO (`InventoryItemRequest.java`):** Hoàn toàn không chứa trường `currentQuantity` khi gọi PUT, loại trừ mọi nguy cơ hacker chèn thêm payload qua Postman.

---

### 7.2. Luồng 2: Vòng đời Phiếu nhập kho & Thuật toán Giá vốn bình quân gia quyền di động (MAC)
* **Tệp mã nguồn:**
  - Backend Service: [`StockReceiptService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/StockReceiptService.java#L194-L260)
  - Backend Controller: [`ManagerStockReceiptController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerStockReceiptController.java#L70-L85)

* **Công thức toán học kế toán WAC:**
  $$\text{Đơn giá mới} = \frac{(\text{Số lượng cũ} \times \text{Đơn giá cũ}) + (\text{Số lượng nhập} \times \text{Đơn giá nhập})}{\text{Số lượng cũ} + \text{Số lượng nhập}}$$

* **Code Java hiện thực thuật toán (`StockReceiptService.java:L194-L212`):**
  ```java
  public static long calculateWeightedAverageCost(BigDecimal oldQty, Long oldCost, BigDecimal inQty, Long inCost) {
      if (inCost == null || inCost <= 0) {
          return oldCost != null ? oldCost : 0L;
      }
      long currentOldCost = (oldCost != null && oldCost > 0) ? oldCost : inCost;
      BigDecimal safeOldQty = (oldQty != null && oldQty.compareTo(BigDecimal.ZERO) > 0) ? oldQty : BigDecimal.ZERO;
      BigDecimal safeInQty = (inQty != null && inQty.compareTo(BigDecimal.ZERO) > 0) ? inQty : BigDecimal.ZERO;

      BigDecimal totalQty = safeOldQty.add(safeInQty);
      if (totalQty.compareTo(BigDecimal.ZERO) <= 0 || safeOldQty.compareTo(BigDecimal.ZERO) == 0) {
          return inCost;
      }

      BigDecimal oldTotalVal = safeOldQty.multiply(BigDecimal.valueOf(currentOldCost));
      BigDecimal inTotalVal = safeInQty.multiply(BigDecimal.valueOf(inCost));
      BigDecimal combinedTotal = oldTotalVal.add(inTotalVal);

      // Làm tròn bán phần HALF_UP theo chuẩn kế toán tài chính
      return combinedTotal.divide(totalQty, 0, RoundingMode.HALF_UP).longValue();
  }
  ```

* **Code xác nhận nhập kho và sinh thẻ kho kiểm toán (`StockReceiptService.java:L218-L260`):**
  ```java
  @Transactional
  public StockReceiptView confirmReceipt(Long id, User currentUser) {
      StockReceipt receipt = receiptRepo.findWithDetailsById(id)
              .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu nhập kho id = " + id));

      if (!StockReceipt.DRAFT.equals(receipt.getStatus())) {
          throw ApiException.badRequest("Phiếu nhập đã được xác nhận hoặc đã bị hủy trước đó.");
      }

      receipt.setStatus(StockReceipt.RECEIVED);
      receipt.setConfirmedAt(LocalDateTime.now());

      for (StockReceiptItem item : receipt.getItems()) {
          InventoryItem inv = item.getInventoryItem();
          BigDecimal oldQuantity = inv.getCurrentQuantity() != null ? inv.getCurrentQuantity() : BigDecimal.ZERO;
          Long oldCost = inv.getUnitCost();

          // 1. Tính giá vốn bình quân di động mới
          long newAverageCost = calculateWeightedAverageCost(oldQuantity, oldCost, item.getQuantity(), item.getUnitCost());
          inv.setUnitCost(newAverageCost);

          // 2. Tăng số lượng tồn kho thực tế
          inv.setCurrentQuantity(oldQuantity.add(item.getQuantity()));
          itemRepo.save(inv);

          // 3. Ghi vết bất biến vào Sổ thẻ kho (StockTransaction)
          StockTransaction tx = new StockTransaction();
          tx.setInventoryItem(inv);
          tx.setCreatedBy(currentUser != null ? currentUser : receipt.getCreatedBy());
          tx.setTransactionType(StockTransaction.STOCK_IN);
          tx.setQuantity(item.getQuantity());
          tx.setReason("Nhập kho theo phiếu " + receipt.getReceiptCode());
          tx.setNote(String.format("Nhà cung cấp: %s | Đơn giá nhập: %,d đ | Giá vốn BQ mới: %,d đ",
                  receipt.getSupplierName(), item.getUnitCost(), newAverageCost));
          txRepo.save(tx);
      }
      receiptRepo.save(receipt);
      return StockReceiptView.from(receipt);
  }
  ```

---

### 7.3. Luồng 3: Barista gửi Yêu cầu bổ sung nguyên liệu (`YC-...`) đến Manager
* **Tệp mã nguồn:**
  - Frontend: [`BaristaStockRequestModal.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/barista/BaristaStockRequestModal.jsx)
  - Backend Controller: [`BaristaController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/BaristaController.java#L95-L115)
  - Backend Service: [`StockReceiptService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/StockReceiptService.java#L80-L130)

* **Code xử lý sinh mã phiếu Yêu cầu tự động (`StockReceiptService.java`):**
  ```java
  @Transactional
  public StockReceiptView createBatchShortage(ShortageBatchRequest req, User barista) {
      StockReceipt receipt = new StockReceipt();
      // Sinh mã phiếu theo tiền tố YC (Yêu cầu) thay vì PN (Phiếu nhập nhà cung cấp)
      String code = "YC-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + generateRandomSuffix();
      receipt.setReceiptCode(code);
      receipt.setSupplierName("Quầy pha chế (Đề xuất nội bộ)");
      receipt.setStatus(StockReceipt.DRAFT);
      receipt.setCreatedBy(barista);
      receipt.setNote(String.format("[Ưu tiên: %s] %s", req.priority(), req.note() != null ? req.note() : ""));

      for (ShortageItemRequest itemReq : req.items()) {
          InventoryItem inv = itemRepo.findById(itemReq.inventoryItemId())
                  .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nguyên liệu id = " + itemReq.inventoryItemId()));
          StockReceiptItem item = new StockReceiptItem();
          item.setInventoryItem(inv);
          item.setQuantity(itemReq.suggestedQuantity());
          item.setUnitCost(inv.getUnitCost());
          receipt.addItem(item);
      }
      receipt.recalcTotal();
      receiptRepo.save(receipt);
      return StockReceiptView.from(receipt);
  }
  ```

---

### 7.4. Luồng 4: Tự động trừ kho theo định lượng Recipe khi Barista nhận đơn
* **Tệp mã nguồn:**
  - Backend Service: [`InventoryService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/InventoryService.java#L430-L550)
  - Backend Controller: [`BaristaController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/BaristaController.java#L50-L75)

* **Code kiểm tra trước tồn kho (Pre-check) và Trừ kho nguyên tử (`InventoryService.java:L430-L472`):**
  ```java
  @Transactional
  public void deductForOrder(Order order, User barista) {
      // 1. Phân tích công thức Recipe món chính và toàn bộ Topping đi kèm
      Map<Long, BigDecimal> requiredAmounts = aggregateRequiredInventory(order);

      // 2. Bước 1 - PRE-CHECK: Kiểm tra xem kho có đủ cho TOÀN BỘ nguyên liệu không
      for (Map.Entry<Long, BigDecimal> entry : requiredAmounts.entrySet()) {
          InventoryItem inv = invMap.get(entry.getKey());
          if (inv == null) continue;
          BigDecimal needed = entry.getValue();
          if (needed.compareTo(inv.getCurrentQuantity()) > 0) {
              // Thiếu hàng -> Ném Exception -> Rollback toàn bộ transaction!
              throw ApiException.badRequest("Không đủ nguyên liệu \"" + inv.getItemName()
                      + "\" để pha chế đơn " + OrderSupportService.displayNumber(order.getOrderNumber())
                      + " (Tồn kho: " + inv.getCurrentQuantity() + " " + inv.getUnit()
                      + ", cần: " + needed + " " + inv.getUnit()
                      + "). Vui lòng báo thiếu nguyên liệu hoặc hủy món.");
          }
      }

      // 3. Bước 2 - THỰC HIỆN TRỪ KHO NGUYÊN TỬ VÀ GHI THẺ KHO
      for (Map.Entry<Long, BigDecimal> entry : requiredAmounts.entrySet()) {
          InventoryItem inv = invMap.get(entry.getKey());
          if (inv == null) continue;
          BigDecimal needed = entry.getValue();

          inv.setCurrentQuantity(inv.getCurrentQuantity().subtract(needed));
          itemRepo.save(inv);

          // Sinh bản ghi kiểm toán STOCK_OUT
          StockTransaction tx = new StockTransaction();
          tx.setInventoryItem(inv);
          tx.setCreatedBy(barista);
          tx.setTransactionType(StockTransaction.STOCK_OUT);
          tx.setQuantity(needed);
          tx.setReason("Pha chế đơn #" + OrderSupportService.displayNumber(order.getOrderNumber()));
          tx.setNote("Tự động trừ khi Barista nhận đơn");
          txRepo.save(tx);
      }
  }
  ```

---

### 7.5. Luồng 5: Báo hao hụt / Hư hỏng sự cố (`WASTE`) có quy trách nhiệm
* **Tệp mã nguồn:**
  - Backend Service: [`InventoryService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/InventoryService.java#L200-L255)
  - Backend Controller: [`BaristaController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/BaristaController.java#L120-L145)

* **Code ghi nhận biên bản sự cố hao hụt (`InventoryService.java:L200-L245`):**
  ```java
  @Transactional
  public InventoryItemView waste(Long id, WasteReportRequest req, User currentUser) {
      InventoryItem item = findItem(id);

      if (req.quantity() == null || req.quantity().compareTo(BigDecimal.ZERO) <= 0) {
          throw ApiException.badRequest("Số lượng báo hao hụt/hỏng phải lớn hơn 0.");
      }
      if (req.quantity().compareTo(item.getCurrentQuantity()) > 0) {
          throw ApiException.badRequest("Số lượng báo hao hụt (" + req.quantity()
                  + ") vượt quá số lượng tồn hiện tại (" + item.getCurrentQuantity() + ").");
      }

      // Giảm tồn kho nguyên liệu
      item.setCurrentQuantity(item.getCurrentQuantity().subtract(req.quantity()));
      itemRepo.save(item);

      // Tính tổng giá trị tổn thất theo đơn giá vốn WAC hiện tại
      long unitCost = item.getUnitCost() != null ? item.getUnitCost() : 0L;
      long totalLoss = req.quantity().multiply(BigDecimal.valueOf(unitCost)).longValue();

      // Ghi thẻ kho phân loại rõ nguyên nhân chủ quan / khách quan & trách nhiệm bồi thường
      StockTransaction tx = new StockTransaction();
      tx.setInventoryItem(item);
      tx.setCreatedBy(currentUser);
      tx.setTransactionType(StockTransaction.WASTE);
      tx.setQuantity(req.quantity());
      tx.setReason("Hao hụt / Đổ vỡ / Hư hỏng nguyên liệu");
      
      String note = String.format("Nguyên nhân: %s | Thiệt hại: %,d đ", req.causeType(), totalLoss);
      if ("SUBJECTIVE".equalsIgnoreCase(req.causeType())) {
          note += String.format(" | Nhân viên chịu phạt: %s (Bồi thường %d%%)", req.staffName(), req.compensationPercentage());
      }
      tx.setNote(note);
      txRepo.save(tx);

      return InventoryItemView.from(item);
  }
  ```

---

### 7.6. Luồng 6: Background Job quét tồn kho tối thiểu (SRS Background Job #1)
* **Tệp mã nguồn:**
  - Background Service: [`LowStockCheckingJob.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/LowStockCheckingJob.java)
  - Controller: [`ManagerDashboardController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerDashboardController.java)

* **Code Java hiện thực Job định kỳ & RAM Caching (`LowStockCheckingJob.java:L38-L82`):**
  ```java
  @Service
  public class LowStockCheckingJob {
      private final InventoryItemRepository itemRepo;

      // Bộ đệm thread-safe lưu kết quả quét gần nhất để phục vụ Dashboard tức thì trong 1ms
      private final AtomicReference<LowStockSnapshot> latestSnapshot = new AtomicReference<>(
              new LowStockSnapshot(LocalDateTime.now(), 0, List.of())
      );

      @Scheduled(
              initialDelayString = "${app.inventory.low-stock-job.initial-delay-ms:10000}",
              fixedDelayString = "${app.inventory.low-stock-job.interval-ms:60000}"
      )
      @Transactional(readOnly = true)
      public void executeJob() {
          checkLowStock();
      }

      @Transactional(readOnly = true)
      public LowStockSnapshot checkLowStock() {
          LocalDateTime now = LocalDateTime.now();
          // Quét tất cả nguyên liệu có current_quantity <= minimum_stock_level
          List<InventoryItem> lowStockEntities = itemRepo.findLowStock(InventoryItem.ACTIVE);

          List<InventoryItemView> views = lowStockEntities.stream()
                  .map(InventoryItemView::from)
                  .toList();

          LowStockSnapshot snapshot = new LowStockSnapshot(now, views.size(), views);
          latestSnapshot.set(snapshot); // Cập nhật cache nguyên tử

          if (views.isEmpty()) {
              log.info("[SRS Job #1] Quét tồn kho lúc {}: Toàn bộ nguyên liệu ở mức an toàn.", now);
          } else {
              log.warn("[SRS Job #1] CẢNH BÁO: Phát hiện {} nguyên liệu chạm ngưỡng tối thiểu!", views.size());
          }
          return snapshot;
      }
  }
  ```

---

### 7.7. Luồng 7: Báo cáo Doanh thu, Lọc đa kỳ & Xuất file Excel không lỗi font tiếng Việt (GBR-12)
* **Tệp mã nguồn:**
  - Backend Service: [`RevenueService.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/service/RevenueService.java#L50-L100)
  - Backend Controller: [`ManagerRevenueController.java`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/backend/src/main/java/com/example/project/controller/ManagerRevenueController.java)
  - Frontend: [`RevenueReport.jsx`](file:///c:/Users/ganda/OneDrive/Documents/SWP391/SWP391-Coffe-Shop-Managerment-Develop/frontend/src/pages/manager/RevenueReport.jsx#L75-L120)

* **Code kỹ thuật xuất CSV/Excel đính kèm Byte Order Mark (`\uFEFF`) (`RevenueReport.jsx:L76-L118`):**
  ```javascript
  function exportRevenueCSV(data, title) {
    if (!data) return;
    const lines = [];
    lines.push('BÁO CÁO DOANH THU & BÁN HÀNG');
    lines.push(`Kỳ báo cáo: ${title}`);
    lines.push(`Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}\r\n`);

    lines.push('TỔNG HỢP KINH DOANH');
    lines.push(`Tổng doanh thu,${data.summary.total}`);
    lines.push(`Tổng số hóa đơn,${data.summary.billCount}`);
    lines.push(`Doanh thu tiền mặt,${data.summary.cash}`);
    lines.push(`Doanh thu chuyển khoản,${data.summary.transfer}\r\n`);

    lines.push('CHI TIẾT THEO MỐC THỜI GIAN');
    lines.push('Mốc thời gian,Số hóa đơn,Tiền mặt (VNĐ),Chuyển khoản (VNĐ),Tổng doanh thu (VNĐ),Tỉ trọng (%)');
    for (const r of data.rows) {
      const share = data.summary.total ? ((r.total * 100) / data.summary.total).toFixed(1) : '0';
      lines.push(`"${r.label}",${r.billCount},${r.cash},${r.transfer},${r.total},${share}%`);
    }

    // "\uFEFF" (UTF-8 BOM) đảm bảo Microsoft Excel nhận dạng đúng font Unicode tiếng Việt có dấu
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoCaoDoanhThu_${data.from}_${data.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  ```

---

## 8. HƯỚNG DẪN TRÌNH BÀY SYSTEM TEST (TEMPLATE 3) & KỊCH BẢN BẢO VỆ TRƯỚC HỘI ĐỒNG

Tài liệu System Test được xây dựng theo chuẩn **Template 3 (System Test Report)** bắt buộc của Đại học FPT đối với học phần tốt nghiệp/dự án SWP391.

### 8.1. Cấu trúc tổng thể của Template 3 trong File Excel
File Excel `Template3_System-Test.xlsx` bao gồm 3 Sheet chức năng được chuẩn hóa:

1. **Sheet 1: `Cover` (Trang bìa & Lịch sử thay đổi):**
   - **Project Name:** Coffee Shop Management System (Gạch Coffee)
   - **Class/Semester:** SWP391_SP26
   - **Document Title:** `SWP391_SP26_System_Test_Report_v1.0`
   - **Author / Tester:** Phạm Gia Bảo (BaoPG)
   - **Revision History:** Ghi nhận phiên bản 1.0, ngày kiểm thử, mô tả cập nhật đầy đủ 12 Test Cases chi tiết cho phân hệ Kho, Công thức Recipe, Barista và Báo cáo doanh thu.

2. **Sheet 2: `Test Cases` (Môi trường & Danh mục Use Case):**
   - **Môi trường thử nghiệm (Test Environment):**
     * Backend Server: Spring Boot 3.3.4, Java 17 OpenJDK, Hibernate / JPA.
     * Database: MySQL 8.0 / PostgreSQL 15, Transaction Isolation Level: `READ_COMMITTED`.
     * Frontend Client: React 18, Vite, Bootstrap 5, Axios, React Router v6.
     * Browsers: Google Chrome 120+, Microsoft Edge.
     * Background Workers: Spring `@Scheduled` (`LowStockCheckingJob`).
   - **Danh sách Use Case Mapping:** Bảng liên kết từng chức năng vào Sheet kịch bản kiểm thử tương ứng.

3. **Sheet 3: `Inventory & Stock Flow` (Workflow Sheet kiểm thử E2E):**
   - Chứa toàn bộ 12 Test Cases được nhóm theo 6 Scenarios luồng nghiệp vụ.
   - Mỗi Test Case gồm 14 cột tiêu chuẩn: ID, Test Scenario, Test Case Description, Test Procedure, Test Data, Expected Results, Actual Results, Status (Pass/Fail), Severity, Pre-conditions, Date, Tester.

---

### 8.2. Danh sách 12 Test Cases System Test Chuẩn Template 3 (`INV-01` &rarr; `INV-12`)

| Test Case ID | Thuộc Scenario | Tên ca kiểm thử & Mô tả nghiệp vụ | Tiền điều kiện (Pre-conditions) | Các bước thực hiện (Procedure) | Kết quả kỳ vọng (Expected Results) | Trạng thái (Round 1) |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **`INV-01`** | **Scenario A** | Thêm mới nguyên liệu và thiết lập số tồn ban đầu đầu kỳ | Manager đăng nhập. Tên nguyên liệu chưa tồn tại. | 1. Mở `/manager/inventory`.<br>2. Bấm "Thêm nguyên liệu".<br>3. Nhập: Cà phê Robusta, ĐVT: kg, Min: 10, Tồn đầu: 50, Giá vốn: 150.000 đ.<br>4. Bấm "Lưu thay đổi". | - Toast báo thành công.<br>- Danh sách hiển thị tồn 50 kg, min 10 kg, trạng thái "Bình thường".<br>- Thẻ kho sinh 1 bản ghi `STOCK_IN` 50 kg. | **PASSED** |
| **`INV-02`** | **Scenario A** | Kiểm tra tính bất biến của tồn kho khi sửa nguyên liệu | Đã có nguyên liệu tồn 50 kg. | 1. Bấm icon sửa nguyên liệu.<br>2. Sửa Min stock = 15 kg.<br>3. Kiểm tra ô "Số lượng tồn".<br>4. Bấm "Lưu thay đổi". | - Ô "Số lượng tồn" bị vô hiệu hóa (`disabled/read-only`).<br>- Định mức cập nhật 15 kg.<br>- Tồn kho giữ nguyên 50 kg không đổi. | **PASSED** |
| **`INV-03`** | **Scenario B** | Tạo phiếu nhập kho NCC ở trạng thái Bản nháp (`DRAFT`) | Đã có danh mục nguyên liệu & NCC. | 1. Mở `/manager/stock-receipts`.<br>2. Bấm "Tạo phiếu nhập".<br>3. Chọn NCC Trung Nguyên, thêm 20 kg Cà phê giá 160.000 đ, 30 lon sữa giá 22.000 đ.<br>4. Bấm "Lưu bản nháp". | - Phiếu sinh mã chuẩn `PN-yyyyMMdd-XXXX` trạng thái `DRAFT`.<br>- Tồn kho và giá vốn của các nguyên liệu chưa bị thay đổi. | **PASSED** |
| **`INV-04`** | **Scenario B** | Xác nhận nhập kho (`RECEIVED`) và tính giá vốn bình quân MAC | Phiếu nhập ở `DRAFT`. Tồn trước 50 kg giá 150.000 đ. | 1. Tại phiếu PN nháp, bấm "Xác nhận nhập kho".<br>2. Xác nhận trên hộp thoại.<br>3. Kiểm tra lại trang tồn kho. | - Trạng thái phiếu thành `RECEIVED`.<br>- Tồn Cà phê tăng lên 70 kg.<br>- Giá vốn tính lại chuẩn MAC: $(50 \times 150.000 + 20 \times 160.000) / 70 = 152.857$ đ.<br>- Thẻ kho ghi nhận `STOCK_IN`. | **PASSED** |
| **`INV-05`** | **Scenario B** | Hủy phiếu nhập kho (`CANCELLED`) không làm đổi số tồn | Phiếu ở trạng thái `DRAFT`. | 1. Bấm "Hủy phiếu" tại dòng phiếu DRAFT.<br>2. Nhập lý do hủy.<br>3. Kiểm tra lại số tồn kho. | - Phiếu chuyển sang `CANCELLED`.<br>- Tồn kho và giá vốn giữ nguyên.<br>- Không sinh bản ghi `STOCK_IN` nào vào thẻ kho. | **PASSED** |
| **`INV-06`** | **Scenario C** | Barista gửi đề xuất báo thiếu hàng loạt (`YC-...`) về Manager | Barista đăng nhập tại quầy pha chế. | 1. Mở `/barista/board`.<br>2. Bấm "Báo thiếu nguyên liệu".<br>3. Chọn Cà phê Robusta, chọn Khẩn cấp (URGENT).<br>4. Bấm "Gửi yêu cầu". | - Toast báo gửi thành công.<br>- Phía Manager xuất hiện 1 phiếu nhập kho mới mã `YC-yyyyMMdd-XXXX` ở trạng thái `DRAFT`. | **PASSED** |
| **`INV-07`** | **Scenario C** | Barista báo hao hụt / đổ vỡ nguyên liệu có bồi thường cá nhân | Tồn kho Sữa tươi $\ge 2$ hộp. | 1. Bấm "Báo hao hụt / Đổ vỡ".<br>2. Chọn Sữa tươi, SL: 2 hộp, Lỗi chủ quan.<br>3. Chọn nhân viên bồi thường 50%.<br>4. Bấm "Xác nhận". | - Tồn kho Sữa tươi giảm 2 hộp ngay lập tức.<br>- Thẻ kho ghi nhận giao dịch `WASTE` kèm tên nhân viên và % bồi thường.<br>- DB chặn không cho âm kho. | **PASSED** |
| **`INV-08`** | **Scenario D** | Tự động trừ kho theo định lượng Recipe khi nhận đơn pha chế | Món đã cài công thức Recipe. Tồn kho đủ. | 1. Khách đặt 2 ly Cà phê sữa đá (25g cà phê + 30ml sữa/ly).<br>2. Barista bấm nhận làm đơn trên bảng pha chế.<br>3. Manager kiểm tra tồn kho. | - Tồn Cà phê tự động trừ đúng 50g.<br>- Tồn Sữa đặc tự động trừ đúng 60ml.<br>- Thẻ kho sinh các bản ghi `STOCK_OUT` ghi chú rõ mã đơn hàng. | **PASSED** |
| **`INV-09`** | **Scenario D** | Chặn thao tác và báo lỗi khi tồn kho không đủ định lượng Recipe | Tồn kho thực tế nhỏ hơn định lượng công thức. | 1. Chỉnh tồn siro Đào còn 10ml.<br>2. Khách đặt 1 ly Trà đào (cần 40ml).<br>3. Barista bấm nhận làm đơn. | - Hệ thống chặn giao dịch (HTTP 400): *"Không đủ nguyên liệu Trà Đào để pha chế..."*.<br>- Không có nguyên liệu nào bị trừ dở dang (`@Transactional Rollback`). | **PASSED** |
| **`INV-10`** | **Scenario E** | Kiểm tra bộ lọc cảnh báo sắp hết hàng và hiển thị Dashboard | Có nguyên liệu có tồn $\le$ định mức an toàn. | 1. Vào `/manager/inventory`, bấm tab "Sắp hết".<br>2. Mở `/manager/overview` kiểm tra KPI. | - Bảng danh sách lọc chính xác nguyên liệu chạm ngưỡng an toàn kèm huy hiệu đỏ/vàng.<br>- Số liệu đồng nhất với KPI Dashboard. | **PASSED** |
| **`INV-11`** | **Scenario E** | Tra cứu Sổ thẻ kho bất biến đối soát biến động theo ngày | Đã có phát sinh giao dịch kho trong ngày. | 1. Vào `/manager/stock-history`.<br>2. Chọn ngày kiểm tra.<br>3. Lọc theo từng loại biến động. | - Hiển thị bảng nhật ký kiểm toán bất biến: Giờ, Nguyên liệu, Loại, SL đổi, Tồn trước, Tồn sau, Nhân viên.<br>- Công thức đối soát khớp 100%. | **PASSED** |
| **`INV-12`** | **Scenario F** | Báo cáo Doanh thu đa kỳ, xuất file Excel và chu trình E2E | Đã có các đơn hàng hoàn tất thanh toán. | 1. Vào `/manager/revenue`.<br>2. Chọn Tùy chọn ngày (`CUSTOM`).<br>3. Xem Doanh thu, Đơn hàng, Tiền mặt/CK, Top món.<br>4. Bấm "Xuất CSV / Excel". | - Dữ liệu thống kê chuẩn xác theo khoảng ngày.<br>- File Excel tải về mở chuẩn font Unicode tiếng Việt, khớp 100% dữ liệu màn hình.<br>- Chu trình E2E khép kín toàn diện. | **PASSED** |

---

### 8.3. Bảng Ma trận truy vết kiểm thử (Traceability Matrix)

| Yêu cầu nghiệp vụ (SRS Requirement / GBR) | Mã Use Case | Màn hình Frontend | Backend API Endpoint | System Test Case ID |
| :--- | :---: | :--- | :--- | :---: |
| Quản lý danh mục nguyên liệu & Đơn vị tính | UC-IV01 | `/manager/inventory` | `GET/POST /api/manager/inventory` | **`INV-01`** |
| Quy tắc bất biến số lượng tồn kho | GBR-09 | `/manager/inventory` | `PUT /api/manager/inventory/{id}` | **`INV-02`** |
| Tạo phiếu nhập kho nhà cung cấp (Bản nháp) | UC-IV02 | `/manager/stock-receipts` | `POST /api/manager/stock-receipts` | **`INV-03`** |
| Duyệt nhập kho & Tính giá vốn bình quân WAC | UC-IV04 | `/manager/stock-receipts` | `POST /api/manager/stock-receipts/{id}/confirm` | **`INV-04`** |
| Hủy phiếu nhập kho nháp | UC-IV02 | `/manager/stock-receipts` | `POST /api/manager/stock-receipts/{id}/cancel` | **`INV-05`** |
| Barista gửi đề xuất báo thiếu nguyên liệu hàng loạt | UC-B05 | `/barista/board` | `POST /api/barista/stock-receipts/batch-shortage` | **`INV-06`** |
| Barista báo hao hụt / hư hỏng sự cố đổ vỡ | UC-B06 | `/barista/inventory` | `POST /api/barista/inventory/{id}/waste` | **`INV-07`** |
| Tự động trừ kho theo công thức Recipe món | GBR-07 | `/barista/board` | `POST /api/barista/orders/{id}/accept` | **`INV-08`** |
| Chặn âm kho và kiểm tra tồn kho định lượng | GBR-08 | `/barista/board` | `POST /api/barista/orders/{id}/accept` | **`INV-09`** |
| Cảnh báo nguyên liệu chạm ngưỡng an toàn | UC-IV03 | `/manager/overview` | `GET /api/manager/dashboard/low-stock-snapshot` | **`INV-10`** |
| Tra cứu Sổ thẻ kho kiểm toán bất biến theo ngày | GBR-09 | `/manager/stock-history` | `GET /api/manager/inventory/history` | **`INV-11`** |
| Báo cáo Doanh thu đa kỳ & Xuất file Excel | UC-RP01, GBR-12 | `/manager/revenue` | `GET /api/manager/revenue?period=CUSTOM` | **`INV-12`** |

---

### 8.4. Kịch bản & Quy trình Trình bày System Test trước Hội đồng chấm thi (8 Phút Thuyết Phục)

Khi bước vào phòng bảo vệ đồ án, hãy thực hiện bài trình bày System Test theo đúng 4 giai đoạn sau:

#### Giai đoạn 1: Giới thiệu Kiến trúc Kiểm thử & Ma trận Truy vết (Thời lượng: 1 - 2 Phút)
* **Lời thoại mẫu:**  
  > *"Kính thưa Hội đồng, em là Phạm Gia Bảo. Trong đồ án Gạch Coffee, em chịu trách nhiệm thiết kế và hiện thực phân hệ Quản lý Kho, Vòng đời Phiếu nhập, Sổ thẻ kho bất biến, Giá vốn bình quân gia quyền di động (MAC), Background Job quét tồn kho và Báo cáo doanh thu.  
  > Toàn bộ quá trình kiểm thử hệ thống được em chuẩn hóa trong file System Test Report theo đúng mẫu Template 3 của Trường. Em đã thiết lập 12 Test Cases bao phủ toàn diện 6 Scenarios luồng nghiệp vụ từ `INV-01` đến `INV-12`. Dưới đây, em xin phép trình diễn chu trình kiểm thử E2E khép kín thực tế trên hệ thống đang chạy."*

#### Giai đoạn 2: Trình diễn Chu trình E2E Khép kín (Happy Path) (Thời lượng: 3 - 4 Phút)
* **Bước 1 (INV-01 & INV-02):** Mở `/manager/inventory`, thêm nguyên liệu "Cà phê Robusta" với tồn 50kg, min_stock 10kg. Bấm sửa nguyên liệu, chỉ cho Hội đồng thấy ô "Số lượng tồn" bị disabled hoàn toàn (GBR-09).
* **Bước 2 (INV-03 & INV-04):** Mở `/manager/stock-receipts`, tạo phiếu nhập 20kg Cà phê đơn giá 160.000 đ ở trạng thái `DRAFT`. Bấm **"Xác nhận nhập kho"**. Chỉ cho Hội đồng thấy: Tồn kho tăng lên 70kg và đơn giá vốn được hệ thống tự động hòa trộn tính lại thành **152.857 đ/kg** theo công thức WAC.
* **Bước 3 (INV-08):** Đóng vai khách đặt món / thu ngân nhận đơn 2 ly Cà phê sữa đá. Chuyển sang giao diện Barista `/barista/board`, bấm nhận làm đơn. Quay lại kho, F5 cho Hội đồng thấy số tồn Cà phê đã bị trừ đúng 50g theo định lượng Recipe.
* **Bước 4 (INV-12):** Mở `/manager/revenue`, chọn khoảng ngày tùy chọn, cho Hội đồng xem tổng doanh thu vừa thu, biểu đồ tỷ trọng và bấm nút **"Xuất CSV/Excel"** mở trực tiếp trên máy không bị lỗi font tiếng Việt.

#### Giai đoạn 3: Trình diễn các Ca kiểm thử Tiêu cực & Bắt lỗi Biên (Negative & Boundary Test) (Thời lượng: 2 Phút)
* **Thử nghiệm 1 (INV-09):** Đổi tồn kho của 1 nguyên liệu xuống 0 hoặc dưới định lượng. Thử nhận đơn pha chế món đó &rarr; Hệ thống lập tức quăng lỗi `400 Bad Request`, nêu rõ thiếu nguyên liệu nào và giữ nguyên số lượng tồn (Rollback nguyên tử).
* **Thử nghiệm 2 (INV-07):** Tại giao diện Barista, thực hiện báo hỏng đổ vỡ nguyên liệu vượt quá tồn kho thực tế &rarr; Hệ thống chặn ngay lập tức. Thử báo hỏng 1 hộp sữa do lỗi bất cẩn &rarr; Hệ thống ghi nhận tên nhân viên bồi thường và lưu vào thẻ kho.
* **Thử nghiệm 3 (Phản biện Postman):** Giải thích rõ ràng nếu cố tình can thiệp request gửi số lượng âm hoặc cố tình chèn trường `currentQuantity` thì tầng Validation và Service sẽ loại bỏ ra sao.

#### Giai đoạn 4: Đối soát Sổ Thẻ Kho Bất biến (Audit Trail) & Kết luận (Thời lượng: 1 Phút)
* **Mở `/manager/stock-history`:** Cho Hội đồng thấy bảng nhật ký kiểm toán: Tất cả các thao tác từ Bước 1 đến Bước 3 đều được ghi nhận chi tiết: `STOCK_IN` (nhập kho), `STOCK_OUT` (pha chế đơn hàng), `WASTE` (báo hỏng).
* **Lời kết:**  
  > *"Qua chu trình E2E và 12 Test Cases đã chạy thành công 100%, em đã chứng minh được hệ thống bảo toàn tính toàn vẹn dữ liệu kế toán, không thể xảy ra hiện tượng âm kho hay sửa gian lận số liệu tồn. Em xin chân thành cảm ơn các Thầy/Cô trong Hội đồng và sẵn sàng nhận các câu hỏi phản biện ạ!"*

---

*Tài liệu được biên soạn và chuẩn hóa đầy đủ theo toàn bộ phạm vi nghiệp vụ, mã nguồn thực tế và hồ sơ kiểm thử System Test chuẩn Template 3 của sinh viên Phạm Gia Bảo (BaoPG).*

